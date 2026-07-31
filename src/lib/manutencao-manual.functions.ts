import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Input = {
  link?: string;
  pdfBase64?: string;
  pdfFilename?: string;
};

function parseDataVisita(raw: string): string {
  const s = raw.trim();
  // ISO já formatada
  const iso = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // Primeira data DD/MM/YYYY encontrada (suporta intervalos como "02/03/2026 até 06/03/2026")
  const m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = "20" + yyyy;
    return `${yyyy}-${mm}-${dd}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function extractField(text: string, label: string): string | null {
  const re = new RegExp(`${label}\\s*:\\s*(.+?)\\s*$`, "im");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function extractDocId(url: string): string | null {
  const m = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function splitMachines(raw: string): string[] {
  return raw
    .split(/\s+e\s+|,|\//i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const registrarManutencaoManual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: Input) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // company id of the user
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();
    if (pErr || !profile?.company_id) {
      throw new Error("Empresa do usuário não encontrada");
    }
    const companyId = profile.company_id as string;

    let texto = "";
    let linkRelatorio: string | null = null;

    if (data.link && data.link.trim()) {
      const docId = extractDocId(data.link.trim());
      if (!docId) throw new Error("Link do Google Docs inválido");
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error(
          "Não foi possível baixar o documento. Verifique se o link está compartilhado publicamente.",
        );
      }
      texto = await res.text();
      linkRelatorio = data.link.trim();
    } else if (data.pdfBase64) {
      // decode base64 → Uint8Array
      const b64 = data.pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      const { text } = await extractText(pdf, { mergePages: true });
      texto = Array.isArray(text) ? text.join("\n") : text;

      // upload to storage
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const filename = (data.pdfFilename ?? "relatorio.pdf").replace(/[^\w.\-]+/g, "_");
      const path = `${companyId}/${crypto.randomUUID()}-${filename}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("relatorios-manutencao")
        .upload(path, bytes, { contentType: "application/pdf", upsert: false });
      if (upErr) throw new Error(`Erro ao salvar PDF: ${upErr.message}`);
      const { data: signed, error: sErr } = await supabaseAdmin.storage
        .from("relatorios-manutencao")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10); // 10 years
      if (sErr) throw new Error(`Erro ao gerar link do PDF: ${sErr.message}`);
      linkRelatorio = signed.signedUrl;
    } else {
      throw new Error("Envie um PDF ou cole um link do Google Docs");
    }

    if (!texto || texto.trim().length < 10) {
      throw new Error("Não foi possível extrair texto do documento");
    }

    // Remove a seção de assinatura e o rodapé de faturamento (e qualquer conteúdo depois deles)
    texto = texto
      .split(/\n?\s*_{3,}\s*\n/)[0]
      .split(/\n\s*Assinatura\s+do\s+Respons[aá]vel[^\n]*/i)[0]
      .split(/Este\s+relatório\s+solicita\s+confirmação\s+para\s+faturamento/i)[0]
      .replace(/\s+$/g, "");

    const cliente = extractField(texto, "Cliente");
    const maquinaRaw = extractField(texto, "M[aá]quina");
    const tecnico = extractField(texto, "T[eé]cnico");
    const dataRaw = extractField(texto, "Data");

    if (!cliente || !maquinaRaw) {
      throw new Error(
        "Documento não segue o modelo padrão de relatório (campos Cliente: e Máquina: não encontrados).",
      );
    }

    const dataVisita = dataRaw ? parseDataVisita(dataRaw) : new Date().toISOString().slice(0, 10);
    const tecnicoFinal = tecnico ?? "—";
    const seriais = splitMachines(maquinaRaw);
    if (seriais.length === 0) throw new Error("Nenhum número de série identificado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rows = seriais.map((numero_serie) => ({
      relatorio_id: `manual_${crypto.randomUUID()}`,
      numero_serie,
      cliente,
      tecnico: tecnicoFinal,
      data_visita: dataVisita,
      relatorio: texto,
      link_relatorio: linkRelatorio,
      company_id: companyId,
    }));

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("manutencoes")
      .insert(rows)
      .select();
    if (insErr) throw new Error(insErr.message);

    if (inserted && inserted.length > 0) {
      const techRows: { manutencao_id: string; tecnico: string; company_id: string }[] = [];
      for (const m of inserted) {
        const rawNome = (m.tecnico ?? "").trim();
        if (!rawNome) continue;

        const names = rawNome
          .replace(/\s+e\s+/gi, "|")
          .replace(/\s+&\s+/g, "|")
          .replace(/,/g, "|")
          .replace(/\//g, "|")
          .split("|")
          .map((t) => t.trim())
          .filter(Boolean);

        for (const nome of names) {
          techRows.push({
            manutencao_id: m.id,
            tecnico: nome,
            company_id: companyId,
          });
        }
      }

      if (techRows.length > 0) {
        const { error: techErr } = await supabaseAdmin
          .from("manutencao_tecnicos")
          .insert(techRows);
        if (techErr) {
          console.error("Erro ao inserir técnicos da manutenção:", techErr);
        }
      }
    }

    return { sucesso: true, criadas: inserted?.length ?? 0, seriais };
  });

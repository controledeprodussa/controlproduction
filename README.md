# MachineFlow Studio

Segue um prompt completo e estruturado para você colar no Lovable. Ele já está escrito como uma especificação de produto, descrevendo comportamento, layout, regras de negócio e design.

Prompt para o Lovable

Crie um sistema web responsivo (Desktop + Mobile) chamado Controle de Produção, destinado ao gerenciamento da fabricação de máquinas industriais.

O sistema deve possuir um design moderno, minimalista e elegante, inspirado no layout do aplicativo de referência anexado.

Estilo visual

Tema Dark

Fundo em tons de cinza escuro (#121212 ou similar)

Cards com leve contraste

Bordas arredondadas (16px)

Sombras discretas

Interface limpa

Muito espaçamento entre elementos

Ícones simples (Lucide Icons)

Fonte moderna (Inter)

As cores de status devem ser:

🔵 Engenharia

🟡 Compras

🟢 Produção

🟣 Embarque

⚫ Entregue

O design deve ser extremamente limpo, semelhante ao aplicativo de referência enviado.

Layout Desktop

No desktop deverá existir uma Sidebar fixa à esquerda.

Menus:

Dashboard

Criar

Máquinas

No rodapé da Sidebar:

Nome do usuário

Botão Sair

Layout Mobile

No mobile:

Sidebar vira Menu Hambúrguer

Ícone no canto superior esquerdo

Ao clicar abre o menu lateral

O restante da interface deve ser idêntico ao Desktop.

Dashboard

A Dashboard é a tela inicial.

Ela deve mostrar todas as máquinas que estão em produção em formato de cards modernos.

Cada card deve conter:

Nome da máquina

Número de série

Cliente

Data de entrega

Modelo da máquina

Barra de progresso

Percentual concluído

Badge de Status

Exemplo:

Máquina CNC 500

Série:
CN500-00012

Cliente:
Metalúrgica Alfa

Entrega:
25/10/2026

Status:
Produção

Progresso:
72%

Barra verde indicando 72%.

Ao clicar no card deve abrir a tela de detalhes da máquina.

Tela de detalhes da máquina

Nesta tela deve aparecer:

Cabeçalho

Nome da máquina

Número de série

Cliente

Modelo

Data de entrega

Status atual

Abaixo deve existir um Checklist de Produção.

Exemplo:

☐ Corte da chapa

☑ Solda da estrutura

☑ Pintura

☐ Montagem elétrica

☐ Montagem pneumática

☐ Testes

☐ Inspeção final

Cada item poderá ser marcado como concluído.

Sempre que um item for marcado:

Atualizar automaticamente a porcentagem da máquina.

Atualizar a barra de progresso.

Atualizar o percentual exibido no Dashboard.

Não deve ser necessário salvar manualmente.

Tudo deve atualizar automaticamente.

Cadastro de Modelo de Máquina

Na aba Criar deve existir um botão:

Criar Modelo de Máquina

Ao clicar abrir formulário.

Campos:

Nome do Modelo

Exemplo:

Prensa Hidráulica

Torno CNC

Router CNC

Injetora

Em seguida haverá um construtor de processos.

Cada processo possui:

Nome do Processo

Peso em %

Exemplo:

Solda
20%

Pintura
10%

Montagem Mecânica
30%

Montagem Elétrica
20%

Pneumática
10%

Testes
10%

Total obrigatoriamente deve ser 100%.

O sistema deve validar isso.

Cada processo criado será automaticamente um item do checklist.

Ao salvar:

Este modelo ficará armazenado como modelo padrão.

Será possível criar quantos modelos desejar.

Cadastro de Máquina

Na aba Criar deve existir outro botão:

Registrar Máquina

Campos:

Nome da máquina

Número de série

Cliente

Data de entrega

Modelo da máquina

(select)

Ao selecionar um modelo:

O sistema deve copiar automaticamente todos os processos daquele modelo para a nova máquina.

Esses processos serão independentes do modelo.

Ou seja:

Se depois o modelo for alterado, máquinas antigas continuam iguais.

Status da Máquina

Cada máquina possui um status independente do checklist.

Os status possíveis são:

Engenharia

Compras

Produção

Embarque

Entregue

Esse status é alterado manualmente.

O checklist controla apenas o progresso da produção.

Não altera o status automaticamente.

Tela Máquinas

Na aba Máquinas deve aparecer uma listagem completa.

Mostrar:

Todas as máquinas

Em produção

Finalizadas

Entregues

No topo haverá filtros:

Todos

Engenharia

Compras

Produção

Embarque

Entregue

Também deve existir busca por:

Nome

Cliente

Número de série

Dashboard

No topo deverão existir cards de resumo.

Exemplo:

Máquinas em Produção

12

Máquinas Entregues

138

Máquinas Atrasadas

4

Produção Média

68%

Barra de Pesquisa

No topo da aplicação deverá existir uma barra de pesquisa.

Ela pesquisa por:

Nome da máquina

Cliente

Número de série

Modelo

Cálculo da Produção

O percentual da máquina nunca será manual.

Ele será calculado automaticamente.

Exemplo:

Modelo:

Solda = 20%

Pintura = 10%

Montagem = 40%

Elétrica = 20%

Testes = 10%

Se somente:

Solda

Pintura

estiverem concluídos:

Progresso:

30%

Componentes

Utilizar componentes modernos.

Cards

Badges

Progress Bar

Drawer

Sidebar

Dialog

Dropdown

Checkbox

Select

Date Picker

Input

Search

Banco de Dados

Criar as seguintes entidades:

MachineModel

id

nome

createdAt

MachineProcessTemplate

id

modelId

nome

peso

ordem

Machine

id

nome

numeroSerie

cliente

dataEntrega

modeloId

status

progresso

createdAt

MachineProcess

id

machineId

nome

peso

concluido

concluidoEm

Regras

O total dos pesos do modelo deve obrigatoriamente ser 100%.

Não permitir salvar modelos inválidos.

O progresso da máquina é calculado automaticamente.

Alterar checklist atualiza imediatamente a porcentagem.

Interface extremamente rápida.

Layout totalmente responsivo.

Mobile e Desktop devem oferecer a mesma experiência.

Usar animações suaves (fade, hover e transições discretas).

Priorizar boa usabilidade e visual moderno.

Tecnologias

Utilizar:

React

TypeScript

Tailwind CSS

shadcn/ui

Lucide Icons

React Hook Form

Zod

Supabase (banco de dados e autenticação)

TanStack Query para gerenciamento de dados

Recharts para gráficos do dashboard

Diferenciais

Dashboard em tempo real com atualização automática.

Barra de progresso animada.

Indicador visual de atraso (máquinas com data de entrega vencida ficam destacadas em vermelho).

Ordenação por data de entrega, progresso e prioridade.

Histórico de conclusão dos processos com data e hora.

Interface premium, minimalista e inspirada no layout das imagens anexadas, mantendo um padrão consistente entre desktop e mobile.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://controlproduction.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fb126982-532f-4668-9d53-feafae3d5729).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

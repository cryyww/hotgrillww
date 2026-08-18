# Hot Dog Master

Crie um sistema web interno chamado "Hot Grill" para gestão operacional e financeira de uma barraca de hot dog personalizado durante uma Feira de Negócios. O sistema será usado exclusivamente pela equipe interna (não é voltado ao cliente final).

CONTEXTO DO NEGÓCIO

O produto principal é o Hot Dog Personalizado: cada cliente escolhe ingredientes diferentes. Por isso, o sistema NÃO pode registrar apenas "1 hot dog vendido" — cada venda precisa registrar exatamente os ingredientes consumidos, senão o estoque, o custo e o lucro ficam incorretos.

1. CADASTRO DE ESTOQUE

Tela para cadastrar produtos/insumos com os campos:

- Nome do produto

- Quantidade comprada

- Unidade de medida (un, g, kg, ml, l)

- Valor unitário

- Valor total (calculado automaticamente)

Deve listar estoque inicial e ser base para a baixa automática.

2. SISTEMA DE VENDAS

Tela de registro de vendas com os produtos:

- Hot Dog Personalizado (com montagem por ingrediente)

- Combo

- Refrigerante

- Trufa

Para o Hot Dog Personalizado, ao registrar a venda, permitir escolher:

Base (obrigatório):

- Quantidade de pão

- Quantidade de salsicha

Adicionais (opcional, em gramas):

- Bacon

- Cheddar

- Milho

- Molho

- Purê

- Batata palha

Campos gerais de cada venda:

- Produto

- Valor

- Forma de pagamento (Pix, Dinheiro, Débito, Crédito)

- Horário (automático, timestamp da venda)

Ao confirmar a venda, o sistema deve dar baixa automática no estoque dos ingredientes usados.

3. CONTROLE AUTOMÁTICO DE ESTOQUE

- Exibir estoque inicial e estoque restante em tempo real

- Gerar alertas visuais quando um item estiver com estoque baixo (definir limite mínimo por item)

- Toda venda confirmada deve reduzir o estoque automaticamente, sem input manual

4. MÓDULO FINANCEIRO

Calcular e exibir em tempo real:

- Receita Bruta

- Custos Diretos

- Custos Indiretos

- Lucro Bruto

- Lucro Líquido

5. DRE AUTOMÁTICA

Gerar demonstrativo no formato:

Receita Bruta

(-) Impostos

(-) CMV (Custo da Mercadoria Vendida)

= Lucro Bruto

(-) Despesas Operacionais

= Lucro Líquido

6. BALANÇO PATRIMONIAL AUTOMÁTICO

ATIVO:

- Caixa

- Estoque

- Contas a receber

PASSIVO:

- Fornecedores

- Obrigações

PATRIMÔNIO LÍQUIDO:

- Capital Social

- Lucros Acumulados

7. RELATÓRIOS FINAIS

Dashboard/relatório com:

- Total vendido (R$ e unidades)

- Produto mais vendido

- Produto mais lucrativo

- Receita por Pix

- Receita por cartão (débito + crédito)

- Receita por dinheiro

- Lucro final

- Estoque consumido (por ingrediente)

REQUISITOS TÉCNICOS E DE UX

- Interface simples, rápida e otimizada para uso em tablet/celular durante o evento (equipe vai operar em pé, no caixa, com movimento)

- Fluxo de registro de venda deve ser o mais rápido possível (poucos cliques)

- Usar Supabase como backend para persistência dos dados (estoque, vendas, financeiro)

- Dashboard com gráficos simples para os relatórios (vendas por forma de pagamento, produto mais vendido, etc.)

- Todos os cálculos (estoque, DRE, balanço, lucro) devem ser automáticos, sem necessidade de digitação manual de totais

- não necessario autentificação, uso apenas interno, sem login nem nada.

Comece pela estrutura de dados (tabelas de produtos, ingredientes, vendas, venda_ingredientes, movimentações de estoque e transações financeiras) e depois construa as telas de Estoque e Vendas primeiro, já que são a base para todo o resto funcionar.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hotdog-hq.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cb921522-404a-4d15-a7f5-a1371f8199a1).

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

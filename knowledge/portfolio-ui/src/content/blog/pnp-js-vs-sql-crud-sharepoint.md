---
title: "PnP JS vs SQL: CRUD no SharePoint explicado"
description: "Comparação lado a lado entre PnP JS e SQL: operadores, get() vs getAll(), SELECT, INSERT, UPDATE, DELETE e JOINs em listas SharePoint."
date: "2020-03-14"
tags:
  - SharePoint
  - PnP JS
  - SQL
  - Microsoft 365
readingTime: "8 min"
---

## Contexto

Quase todos os sistemas desenvolvidos em SharePoint Online envolvem o **PnP JS**, e existem diversas dúvidas de como usar essa biblioteca no dia a dia. Vendo a dificuldade de colegas de trabalho ao usá-la, resolvi escrever este artigo colocando o PnP lado a lado com o SQL, fazendo breves comparações entre ambos.

De um lado, uma linguagem de consulta estruturada usada por milhões de programadores. Do outro, uma coleção de bibliotecas fluentes para consumir as APIs REST do SharePoint, Graph e Microsoft 365, usada por desenvolvedores de aplicações SharePoint.

## PnP JS, o que é?

O [PnP JS](https://pnp.github.io/pnpjs/) é uma coleção de bibliotecas fluentes para consumir APIs REST do SharePoint, Graph e Microsoft 365 de maneira segura. Pode ser usado no SharePoint Framework, em Node.js ou em qualquer projeto JavaScript. É uma iniciativa de código aberto, que incentiva contribuições e feedback da comunidade.

Entre o PnP JS e o SQL existem lógicas semelhantes, porém com sintaxe bem diferente. A seguir, uma comparação prática entre os dois, cobrindo terminologia, operadores, e as quatro operações do CRUD (Create, Read, Update, Delete).

## Terminologia: SQL x PnP JS

Antes de comparar a sintaxe, vale mapear os conceitos equivalentes entre os dois mundos:

| SQL | PnP JS |
|-----|--------|
| Table | Lista/Biblioteca |
| Row | Object (JavaScript) |
| Column | Column (Attribute) |
| Primary Key | Primary Key (por padrão, `Id`) |
| Foreign Key | Lookup |
| Join | `expand()` |
| From | `getByTitle()` |

## Operadores lógicos e de comparação

O PnP JS utiliza operadores no estilo Perl/OData — ou seja, operadores de string, e não os símbolos numéricos usados pelo SQL:

| SQL | PnP JS |
|-----|--------|
| `ASC` | `true` |
| `DESC` | `false` |
| `=` | `eq` |
| `<>` | `ne` |
| `<` | `lt` |
| `>` | `gt` |
| `<=` | `le` |
| `>=` | `ge` |
| `AND` | `and` |
| `OR` | `or` |

`ASC`/`DESC` viram `true`/`false` porque é isso que o segundo parâmetro de `orderBy()` espera (ascendente ou não).

```javascript
// SQL: WHERE tp_Status = 'Ativo' AND tp_ID > 10
const items = await sp.web.lists
  .getByTitle("Clientes")
  .items.filter("Status eq 'Ativo' and Id gt 10")();
```

## CRUD

Assim como o SQL, o PnP JS conta com seu próprio CRUD (Create, Read, Update e Delete). Em ambos os casos é necessário informar a origem dos dados (lista ou tabela), respeitando a estrutura já estabelecida.

## SELECT (Leitura)

### PnP JS

```javascript
import { spfi } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";

const sp = spfi("https://tenant.sharepoint.com/sites/site");

const items = await sp.web.lists
  .getByTitle("Clientes")
  .items.select("Id", "Title", "Email")
  .top(100)
  .orderBy("Created", false)();
```

### SQL

```sql
SELECT TOP 100
  tp_ID AS Id,
  tp_Title AS Title,
  tp_Email AS Email
FROM
  [db_content].[dbo].[UserData]
WHERE
  tp_ListId = 'GUID-DA-LISTA'
ORDER BY
  tp_Created DESC;
```

### get() vs getAll()

No PnP JS existem dois métodos para obter dados de uma lista: `get()` e `getAll()`. Apesar de parecidos, existem diferenças importantes entre eles:

| Item | `get()` | `getAll()` |
|------|---------|------------|
| Quantidade de itens retornados | Até 100 itens | Mais de 100 itens |
| Funciona o `orderBy()` | Sim | Não |
| Funciona o `top()` | Sim | Não |

Ou seja: use `get()` quando precisar ordenar (`orderBy()`) ou limitar (`top()`) o resultado — ele respeita esses métodos, mas fica limitado a uma página (até 100 itens). Use `getAll()` quando precisar de **todos** os itens da lista, independentemente da quantidade — ele pagina automaticamente por trás dos panos, mas ignora `orderBy()` e `top()`.

```javascript
// Até 100 itens, respeitando o filtro e a ordenação
const pagina = await sp.web.lists
  .getByTitle("Clientes")
  .items.orderBy("Created", false)
  .top(100)();

// Todos os itens da lista, sem orderBy() ou top()
const todosOsItens = await sp.web.lists
  .getByTitle("Clientes")
  .items.getAll();
```

## INSERT (Criação)

Assim como no SELECT, deve-se informar a origem. Diferente do SQL, no PnP JS não é obrigatório declarar todas as colunas na chamada, mesmo que a coluna esteja configurada como obrigatória na lista — a validação de campo obrigatório é feita pelo SharePoint no momento da gravação.

Para adicionar um item à lista, usa-se o método `add()`.

### PnP JS

```javascript
await sp.web.lists.getByTitle("Clientes").items.add({
  Title: "João Silva",
  Email: "joao@email.com",
  Status: "Ativo",
});
```

### SQL

```sql
INSERT INTO UserData (tp_Title, tp_Email, tp_Status, tp_ListId)
VALUES ('João Silva', 'joao@email.com', 'Ativo', 'GUID-DA-LISTA');
```

## UPDATE (Atualização)

No `update()` do PnP JS, o `getById()` funciona como a cláusula `WHERE`: só será atualizado o item cujo ID (da lista) foi informado.

### PnP JS

```javascript
await sp.web.lists
  .getByTitle("Clientes")
  .items.getById(42)
  .update({ Status: "Inativo" });
```

### SQL

```sql
UPDATE UserData
SET tp_Status = 'Inativo'
WHERE tp_ID = 42 AND tp_ListId = 'GUID-DA-LISTA';
```

> ⚠️ **Atenção:** nunca execute o `update()` sem o `getById()` (ou outro filtro equivalente), pois, caso contrário, o SharePoint tentará atualizar todos os itens da lista.

## DELETE (Exclusão)

Assim como no UPDATE, o `getById()` serve como condição (`WHERE`).

### PnP JS

```javascript
await sp.web.lists.getByTitle("Clientes").items.getById(42).delete();
```

### SQL

```sql
DELETE FROM UserData
WHERE tp_ID = 42 AND tp_ListId = 'GUID-DA-LISTA';
```

> ⚠️ **Atenção:** nunca execute o `delete()` sem o `getById()`.

## JOINS (campos relacionados)

Para obter campos de uma lista relacionada (lookup), o PnP JS usa `expand()` para trazer a lista relacionada e `filter()` para casar a chave estrangeira — o equivalente ao `ON` do `JOIN` em SQL.

### PnP JS

```javascript
const resultJoin = await sp.web.lists
  .getByTitle("Posts")
  .items.expand("users")
  .filter("Id eq 10 and users/Id eq 10")();
```

### SQL

```sql
SELECT *
FROM posts
JOIN users ON posts.user_id = users.id;
```



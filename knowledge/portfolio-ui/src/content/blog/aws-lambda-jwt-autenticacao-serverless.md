---
title: "AWS Lambda + MySQL + JWT: Autenticação Serverless"
description: "Guia passo a passo para criar uma função Lambda que se conecta a um banco MySQL, valida a existência de um usuário e gera um token JWT — do npm init ao handler completo."
date: "2023-10-25"
tags:
  - AWS Lambda
  - Node.js
  - JWT
  - MySQL
readingTime: "3 min"
---

Para criar um projeto simples em Lambda que se conecta a um banco de dados SQL, valida a existência de um usuário e gera um token para ele, aqui está um guia dividido em etapas.

## Criando o projeto

Crie um diretório no local de sua escolha e, em seguida, execute o comando `npm init` para inicializar um novo arquivo `package.json`.

### Organização de diretórios

- `database.js` — funções relacionadas ao banco de dados
- `jwtOperations.js` — funções relacionadas à geração e validação de tokens
- `handler.js` — arquivo principal contendo o handler do Lambda

### Bibliotecas necessárias

```bash
npm i jsonwebtoken
npm i mysql
```

## Configuração do banco de dados

Use um pool de conexões para otimizar a conexão com o banco de dados e consultas parametrizadas para evitar injeção de SQL.

`database.js`:

```javascript
const mysql = require('mysql');
const pool = mysql.createPool({
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,
    database: process.env.RDS_DATABASE,
    connectionLimit: 10
});

module.exports = pool;
```

## Funções para tokens

Use a biblioteca `jsonwebtoken` para criar e verificar tokens.

`jwtOperations.js`:

```javascript
const { sign } = require('jsonwebtoken');

function createToken(username, id) {
    return sign({ username, id }, process.env.JWT_SECRET, {
        expiresIn: '12h',
        audience: 'auth'
    });
}

module.exports = {
    createToken
};
```

## Handler do Lambda

`handler.js`:

```javascript
const pool = require('./database');
const { createToken } = require('./jwtOperations');

exports.handler = (event, context, callback) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const { document } = event;
    const finalDocument = document || "00000000000";
    const sql = 'SELECT * FROM client WHERE document = ?';

    pool.query(sql, [finalDocument], (err, results) => {
        if (err) {
            callback(null, {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: err.message })
            });
            return;
        }

        if (results && results.length > 0) {
            const user = results[0];
            const token = createToken(user.name, user.id);
            callback(null, {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });
        } else {
            callback(null, {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: "User not found" })
            });
        }
    });
};
```

## Observação

Neste tutorial, pressupõe-se que toda a sua infraestrutura AWS já esteja configurada. É essencial garantir que o banco de dados seja acessível externamente. Se não for, será necessário configurar uma VPC ou ajustar o grupo de segurança do RDS para permitir acesso a todos os endereços IPv4.

No entanto, abrir acesso a todos os IPv4 não é uma prática recomendada — prefira restringir o acesso à VPC da própria Lambda ou a faixas de IP conhecidas.

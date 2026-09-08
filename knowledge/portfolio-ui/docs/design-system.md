# Design System Extraído do Protótipo

Este documento detalha o design system inferido a partir do protótipo fornecido, servindo como base para as futuras melhorias no projeto.

## 1. Princípios Gerais de Design
* **Estilo:** Minimalista, limpo e sofisticado.
* **Espaçamento (Whitespace):** Uso abundante de espaços em branco para separar seções e dar respiro aos elementos, focando na tipografia e nas imagens.
* **Formas:** Mistura de bordas retas (ou levemente arredondadas) para imagens/cards, contrastando com formas totalmente arredondadas (pill-shape) para tags e botões circulares.

## 2. Paleta de Cores

### Fundos (Backgrounds)
* **Background Principal:** Branco puro (`#FFFFFF`) - Usado na maior parte do site para garantir um visual limpo.
* **Background Secundário (Seções):** Cinza muito claro/Off-white (ex: `#F5F5F5` ou `#F9F9F9`) - Usado sutilmente no hero e em algumas seções para criar quebras visuais sem usar linhas duras.
* **Background Escuro (Footer/CTA):** Preto ou Cinza muito escuro (ex: `#1A1A1A` ou `#111111`) - Usado em blocos de destaque (como o banner "Exclusive Winter Deal") e no rodapé.

### Texto
* **Texto Primário (Títulos):** Preto/Cinza Escuro (`#111111`) - Alto contraste para legibilidade.
* **Texto Secundário (Parágrafos e Labels):** Cinza Médio (`#666666` ou `#777777`) - Usado para descrições para não competir com os títulos.

### Acentos/UI
* **Bordas e Linhas Divisórias:** Cinza claro (`#E5E5E5` ou `#EEEEEE`).
* **Elementos Ativos/Ícones:** Preto para fundos de botões com ícones brancos.

## 3. Tipografia

* **Fonte Principal:** Sans-serif geométrica e limpa (Recomendação: `Inter`, `Helvetica Neue`, `Outfit` ou `Roboto`).
* **Hero Text ("Hello"):** Tamanho muito grande, peso **Light** ou **Thin**.
* **Títulos de Seções (H2/H3):** Tamanho grande, peso **Regular** ou **Medium**.
* **Corpo de Texto (Body):** Tamanho legível (16px - 18px), peso **Regular**, altura de linha (line-height) espaçosa (1.5 a 1.6).
* **Labels / Tags:** Tamanho pequeno (12px - 14px), peso **Medium**, text-transform normal ou uppercase dependendo do uso.

## 4. Componentes de UI

### Botões e Tags (Pills)
* **Formato:** Totalmente arredondado (`border-radius: 9999px` ou `rounded-full`).
* **Variante Escura:** Fundo preto, texto branco. Usado para destacar ou indicar estado ativo.
* **Variante Clara:** Fundo cinza claro, texto escuro. Usado para categorias ou filtros inativos (ex: "UI/UX", "Branding").
* **Padding:** Espaçamento horizontal generoso em relação ao vertical (ex: `px-4 py-1`).

### Botões de Ação (Ícones Circulares)
* **Formato:** Círculo perfeito.
* **Estilo:** Fundo preto/escuro com ícone de seta apontando para a diagonal superior direita (↗) em branco.
* Usados como affordance para "ver mais" ou abrir links, frequentemente sobrepostos a imagens ou alinhados à direita em listas.

### Cards e Imagens
* **Formato:** Retangulares ou quadrados com cantos levemente arredondados (`rounded-md` ou `rounded-lg`) ou cantos retos dependendo da seção.
* **Apresentação:** Sem sombras pesadas (drop shadows); o design confia no grid e no espaçamento para definir as áreas.

### Listas / Jornada
* Estrutura em formato de lista simples, separada por linhas divisórias sutis (cinza claro).
* Alinhamento limpo da esquerda para a direita (Data/Empresa -> Papel -> Tags).

## 5. Layout & Estrutura
* **Grid:** Alinhamento centralizado com margens laterais generosas (max-width contido).
* **Navegação (Header):** Topo limpo, logo minimalista na esquerda, links centralizados, botão secundário ("Book A Call") na direita com um pequeno ícone de seta.
* **Hero:** Foco central, tipografia gigante equilibrada com imagem (foto pessoal).

---
*Você pode usar este documento como referência para aplicar as classes utilitárias no Tailwind ou criar os componentes no projeto.*

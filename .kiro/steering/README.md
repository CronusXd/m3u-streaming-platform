# 📋 Steering Rules - PlayCoreTV

Esta pasta contém as regras de comportamento e preferências do projeto que o assistente Kiro deve seguir.

## 📄 Arquivos de Regras

### 1. `auto-approve-commands.md`
**Propósito:** Auto-aprovação automática de comandos

**Comportamento:**
- ✅ Sempre aceita comandos automaticamente
- ✅ Clica em "RUN" sem pedir confirmação
- ✅ Executa imediatamente quando solicitado

**Quando se aplica:** SEMPRE (inclusion: always)

---

### 2. `project-preferences.md`
**Propósito:** Preferências gerais do projeto

**Inclui:**
- ⚡ Estilo de trabalho (velocidade, autonomia)
- 🇧🇷 Preferência de idioma (português)
- 🔧 Configurações técnicas
- 📊 Prioridades do projeto

**Quando se aplica:** SEMPRE (inclusion: always)

---

## 🎯 Como Funciona

### Inclusion Types

1. **`inclusion: always`**
   - Regra sempre ativa
   - Aplicada em todas as interações
   - Não precisa ser chamada manualmente

2. **`inclusion: fileMatch`** (não usado aqui)
   - Ativa apenas quando certos arquivos são lidos
   - Exemplo: `fileMatchPattern: '*.ts'`

3. **`inclusion: manual`** (não usado aqui)
   - Ativa apenas quando chamada com `#`
   - Exemplo: `#steering-rule-name`

---

## 🚀 Regras Ativas

Atualmente, todas as regras estão configuradas como `always`, o que significa:

✅ **Auto-aprovação está ATIVA**
- Comandos são executados automaticamente
- Sem necessidade de confirmação manual
- Fluxo de trabalho otimizado

✅ **Preferências do projeto estão ATIVAS**
- Respostas em português
- Priorização de velocidade
- Autonomia nas decisões técnicas

---

## 📝 Como Adicionar Novas Regras

1. Crie um novo arquivo `.md` nesta pasta
2. Adicione o front-matter:
   ```markdown
   ---
   inclusion: always
   ---
   ```
3. Escreva as regras em markdown
4. Salve o arquivo

**Exemplo:**
```markdown
---
inclusion: always
---

# Minha Nova Regra

Descrição da regra...
```

---

## 🔧 Como Modificar Regras

1. Abra o arquivo da regra
2. Edite o conteúdo
3. Salve
4. As mudanças são aplicadas imediatamente

---

## ❌ Como Desativar Regras

### Opção 1: Mudar inclusion
```markdown
---
inclusion: manual
---
```

### Opção 2: Deletar o arquivo
```bash
rm .kiro/steering/nome-da-regra.md
```

### Opção 3: Renomear
```bash
mv regra.md regra.md.disabled
```

---

## 📚 Documentação Oficial

Para mais informações sobre Steering Rules:
- Veja a documentação do Kiro
- Consulte exemplos em outros projetos
- Pergunte ao assistente Kiro

---

## 🎯 Regras Específicas deste Projeto

### Auto-Aprovação
**Por quê?** O usuário prefere velocidade e confia nas ações do assistente.

**Impacto:** 
- ✅ Fluxo de trabalho mais rápido
- ✅ Menos interrupções
- ⚠️ Menos controle manual (escolha consciente)

### Português
**Por quê?** Projeto brasileiro, equipe fala português.

**Impacto:**
- ✅ Melhor comunicação
- ✅ Documentação mais clara
- ✅ Menos ambiguidade

---

**Criado em:** 15/01/2025  
**Mantido por:** Equipe PlayCoreTV

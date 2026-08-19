/**
 * data-juntada.js
 * Fonte única dos dados de juntada do Mapeador (Matéria → Fase → modelos + descrições).
 * Originou-se do data.js da extensão "Automação PJe - CoPPEx", agora incorporado:
 * deixou de ser espelho — edite os modelos diretamente aqui.
 *
 * Estrutura: BANCO_MODELOS_COPPEX = { Matéria → { Fase → [modelos] } }
 * DESCRICOES_COPPEX = { nomeModelo → textoDescricao }
 */

const BANCO_MODELOS_COPPEX = {
    "CoPPEx - Propaganda": {
        "Composição": [
            "CoPPEx - SePP - Certidão de Composição"
        ],
        "Instrução": [
            "CoPPEx - SePP - Prop - Cumpr parte final Art. 17",
            "CoPPEx - SePP - PropPart - Cumpr. Art. 17",
            "CoPPEx - SePP - Suspensão de anotação"
        ],
        "Decisões PET": [
            "CoPPEx - SePP - PropPart - Cumprimento Decisão PET",
            "CoPPEx - SePP - PropPart - Juntada Decisão PET",
            "CoPPEx - SePP - PropPart - Publicação Decisão PET"
        ],
        "Outros": [
            "CoPPEx - SePP - PropPart - Reclassificação",
            "CoPPEx - SePP - Publicação"
        ]
    },
    "Registro de Candidatura": {
        "Distribuição": [
            "CoADDP - // rcand - ADVOGADO",
            "CoADDP - // RCAND - Distrib s/ prev desembargador",
            "CoADDP - // RCAND - Distrib s/ prev juiz",
            "CoADDP - // RCAND - Distrib s/ prev JUIZA",
            "COADDP - RCAND - Certidão de Autuação c/ alter",
            "COADDP - RCAND - Certidão de Autuação s/ alter"
        ],
        "Cadastro Eleitoral": [
            "RCAND - Cert - Inexistência divergência cadastro",
            "RCAND - Juntada Relatório Divergências"
        ],
        "Impugnação": [
            "RCAND - Cert - Decurso prz para impugnação",
            "RCAND - Inclusão Impug. e adv. e alteração CAND",
            "RCAND - Inclusão Impug. s/ proc. e alteração CAND",
            "RCAND - Inclusão Impugnação no CAND",
            "RCAND - Cert - Pub - Mural+CAND",
            "RCAND - Cert - Dec prz manifestação",
            "RCAND - Cert - Dec pzo manif defesa",
            "RCAND - Cert - decurso - defesa",
            "RCAND - Cert - Pub - ABV Impugnante"
        ],
        "Notícia de Inelegibilidade": [
            "RCAND - Cert - Email p/ PRE - notícia"
        ],
        "Diligências": [
            "RCAND - Cert - Pub - Diligências",
            "RCAND - Cert - Decurso prz diligências"
        ],
        "Prazos": [
            "RCAND - Cert - Decurso prz impugnação",
            "RCAND - Cert - Decurso prz diligências"
        ]
    }
};

const DESCRICOES_COPPEX = {
    "CoPPEx - SePP - Certidão de Composição": "Composição Partidária.",
    "CoPPEx - SePP - Prop - Cumpr parte final Art. 17": "Cumprimento parte final Art.17",
    "CoPPEx - SePP - PropPart - Cumpr. Art. 17": "Cumprimento Art. 17",
    "CoPPEx - SePP - PropPart - Cumprimento Decisão PET": "Cumprimento de Decisão em PET",
    "CoPPEx - SePP - PropPart - Juntada Decisão PET": "Juntada de Decisão em PET",
    "CoPPEx - SePP - PropPart - Publicação Decisão PET": "Publicação de Decisão em PET",
    "CoPPEx - SePP - PropPart - Reclassificação": "Reclassificação de documentos",
    "CoPPEx - SePP - Publicação": "Publicação DJE: Decisão",
    "CoPPEx - SePP - Suspensão de anotação": "Suspensão de anotação partidária",
    "CoADDP - // rcand - ADVOGADO": "",
    "CoADDP - // RCAND - Distrib s/ prev desembargador": "",
    "CoADDP - // RCAND - Distrib s/ prev juiz": "",
    "CoADDP - // RCAND - Distrib s/ prev JUIZA": "",
    "COADDP - RCAND - Certidão de Autuação c/ alter": "",
    "COADDP - RCAND - Certidão de Autuação s/ alter": "",
    "RCAND - Cert - Inexistência divergência cadastro": "Inexistência de  Divergência com o Cadastro Eleitoral",
    "RCAND - Juntada Relatório Divergências": "Relatório de Divergências do Cadastro Eleitoral"
};

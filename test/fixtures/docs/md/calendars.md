# Calendars API

API de exemplo para gerenciamento de calendários.

## Recursos

- Listar calendários disponíveis.
- Criar calendários por time ou projeto.
- Consultar um calendário pelo identificador.
- Atualizar nome, fuso horário e cor.
- Remover calendários que não são mais utilizados.

## Endpoints

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/calendars` | Lista calendários. |
| `POST` | `/calendars` | Cria um calendário. |
| `GET` | `/calendars/{id}` | Consulta um calendário por ID. |
| `PUT` | `/calendars/{id}` | Atualiza um calendário por ID. |
| `DELETE` | `/calendars/{id}` | Remove um calendário por ID. |

## Exemplo de payload

```json
{
  "name": "Product Team Calendar",
  "timezone": "America/Sao_Paulo",
  "color": "#2563eb"
}
```

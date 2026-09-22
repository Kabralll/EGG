import { api } from "./api"

export function getPractice(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value)
  })
  const qs = query.toString()
  return api(`/questions/practice${qs ? `?${qs}` : ""}`)
}

export function answerQuestion(questionId, optionId) {
  return api(`/questions/${questionId}/answer`, {
    method: "POST",
    body: { optionId },
  })
}

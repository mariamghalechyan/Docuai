import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)
export const getDocuments = () => api.get('/documents/')
export const getDocument = (id) => api.get(`/documents/${id}`)
export const uploadDocument = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/documents/upload', form)
}
export const getFields = (id) => api.get(`/documents/${id}/fields`)
export const getFlags = (id) => api.get(`/documents/${id}/flags`)
export const getChat = (id) => api.get(`/documents/${id}/chat`)
export const deleteDocument = (id) => api.delete(`/documents/${id}`)
export const sendChat = (id, content) => api.post(`/documents/${id}/chat`, { content })

export default api

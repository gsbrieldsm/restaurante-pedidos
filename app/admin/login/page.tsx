import { redirect } from 'next/navigation'

// Rota legada — redireciona para o novo endereço da equipe
export default function AdminLoginRedirect() {
  redirect('/operador/login')
}

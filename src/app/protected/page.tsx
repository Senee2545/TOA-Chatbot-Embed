import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChatPage from '../chat/page'


export default async function ProtectedPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/auth/login')
  }

  return (
    <>
    {
      data?.user?.email && <ChatPage email={data.user.email} id={data.user.id} />
    }
    </>
  )
}

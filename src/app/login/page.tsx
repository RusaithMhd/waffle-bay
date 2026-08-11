import { Coffee } from 'lucide-react'
import { LoginForm } from './LoginForm'
import Image from 'next/image'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const { message } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Background Images */}
      <div className="absolute inset-0 z-0">
        {/* Mobile Background */}
        <Image
          src="/background-mobile.jpeg"
          alt="Waffle Bay Mobile Background"
          fill
          priority
          className="object-cover block md:hidden"
        />
        {/* Desktop Background */}
        <Image
          src="/Background-Desktop.jpeg"
          alt="Waffle Bay Desktop Background"
          fill
          priority
          className="object-cover hidden md:block"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="bg-white/10 border-b border-white/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 border border-white/20 mb-4 shadow-inner">
            <Coffee className="h-8 w-8 text-white drop-shadow-sm" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">Waffle Bay</h2>
          <p className="text-white/80 mt-2 font-medium">Point of Sale System</p>
        </div>

        <div className="p-8">
          <LoginForm message={message} />
        </div>
      </div>
    </div>
  )
}

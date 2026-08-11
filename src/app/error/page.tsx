export default function ErrorPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white shadow-lg rounded-2xl text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong.</h1>
        <p className="text-gray-600 mb-8">We could not process your authentication request.</p>
        <a
          href="/login"
          className="inline-flex justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
        >
          Return to Login
        </a>
      </div>
    </div>
  )
}

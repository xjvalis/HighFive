import { useState } from "react";
import { useForm, ValidationError } from "@formspree/react";
import { X, MessageSquare } from "lucide-react";

export default function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [state, handleSubmit] = useForm("meewnzzj");

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 xl:bottom-6 z-50 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        style={{ width: "44px", height: "44px" }}
        title="Poslat feedback"
      >
        <MessageSquare size={20} />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Dialog */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            {state.succeeded ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🙏</div>
                <p className="font-semibold text-lg">Díky za feedback!</p>
                <p className="text-gray-500 text-sm mt-1">Zprávu jsem dostal a přečtu si ji.</p>
                <button
                  onClick={handleClose}
                  className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm transition-colors"
                >
                  Zavřít
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-1">Poslat feedback</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Něco nefunguje? Máš nápad? Napiš mi.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Tvůj email (nepovinné)
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="abcd@email.com"
                      className="w-full border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <ValidationError field="email" prefix="Email" errors={state.errors} className="text-red-500 text-xs mt-1" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Zpráva
                    </label>
                    <textarea
                      name="message"
                      required
                      rows={4}
                      placeholder="Napiš co tě napadá..."
                      className="w-full border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                    <ValidationError field="message" prefix="Zpráva" errors={state.errors} className="text-red-500 text-xs mt-1" />
                  </div>

                  <button
                    type="submit"
                    disabled={state.submitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-full py-2 text-sm font-medium transition-colors"
                  >
                    {state.submitting ? "Odesílám..." : "Odeslat"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

import { useForm, ValidationError } from "@formspree/react";
import { X } from "lucide-react";
import { useContext } from "react";
import { LanguageContext } from "@/lib/language";

export default function FeedbackModal({ open, onClose }) {
  const { lang } = useContext(LanguageContext);
  const [state, handleSubmit] = useForm("meewnzzj");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        {state.succeeded ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🙏</div>
            <p className="font-semibold text-lg">{lang === 'cs' ? 'Díky za feedback!' : 'Thanks for the feedback!'}</p>
            <p className="text-gray-500 text-sm mt-1">{lang === 'cs' ? 'Zprávu jsem dostal a přečtu si ji.' : "I've got your message and will read it."}</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm transition-colors"
            >
              {lang === 'cs' ? 'Zavřít' : 'Close'}
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold mb-1">{lang === 'cs' ? 'Poslat feedback' : 'Send feedback'}</h2>
            <p className="text-gray-500 text-sm mb-5">{lang === 'cs' ? 'Něco nefunguje? Máš nápad? Napiš mi.' : "Something not working? Got an idea? Let me know."}</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                  {lang === 'cs' ? 'Tvůj email (nepovinné)' : 'Your email (optional)'}
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
                  {lang === 'cs' ? 'Zpráva' : 'Message'}
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  placeholder={lang === 'cs' ? 'Napiš co tě napadá...' : "Write what's on your mind..."}
                  className="w-full border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
                <ValidationError field="message" prefix={lang === 'cs' ? 'Zpráva' : 'Message'} errors={state.errors} className="text-red-500 text-xs mt-1" />
              </div>
              <button
                type="submit"
                disabled={state.submitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-full py-2 text-sm font-medium transition-colors"
              >
                {state.submitting ? (lang === 'cs' ? 'Odesílám...' : 'Sending...') : (lang === 'cs' ? 'Odeslat' : 'Send')}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

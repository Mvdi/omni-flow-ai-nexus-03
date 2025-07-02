import { PriceCalculatorWidget } from '@/components/PriceCalculatorWidget';

const PriceCalculator = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Prisberegner</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Få et øjeblikkeligt prisoverslag på vores tagbehandling. Vælg dit areal og se prisen med det samme.
          </p>
        </div>
        
        <div className="flex justify-center">
          <PriceCalculatorWidget />
        </div>
        
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Hvorfor vælge vores tagbehandling?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🧽</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Professionel rengøring</h3>
                <p className="text-gray-600">Vi fjerner effektivt mos, alger og andre forureninger fra dit tag.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🛡️</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Langtidsbeskyttelse</h3>
                <p className="text-gray-600">Vores behandling forebygger genvækst og forlænger tagets levetid.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✨</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Fornyet udseende</h3>
                <p className="text-gray-600">Dit tag får et friskt og velplejet udseende igen.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceCalculator;
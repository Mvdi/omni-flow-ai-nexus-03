import React, { useState } from 'react';

export const PriceCalculatorWidget = () => {
  const [selectedInterval, setSelectedInterval] = useState('0');
  const [includeMaintenance, setIncludeMaintenance] = useState(false);
  const [customM2, setCustomM2] = useState(251);
  const [currentStep, setCurrentStep] = useState(1); // 1 = prisberegning, 2 = kundeoplysninger
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Prisberegning baseret på interval og vedligeholdelse
  const calculatePrice = () => {
    let standardPrice = 0;
    let maintenancePrice = 0;
    let maintenancePriceText = '';
    let savings = 200; // Default savings is always 200 kr

    if (selectedInterval === '0') {
      standardPrice = 995;
      maintenancePrice = 795;
      maintenancePriceText = '795';
    } else if (selectedInterval === '1') {
      standardPrice = 1395;
      maintenancePrice = 1195;
      maintenancePriceText = '1195';
    } else if (selectedInterval === '2') {
      // Dynamic pricing for over 250m²
      const extraM2 = Math.max(0, customM2 - 250);
      const extraCost = extraM2 * 10;
      const baseStandardPrice = 1395;
      const baseMaintenancePrice = 1195;
      
      standardPrice = baseStandardPrice + extraCost;
      
      // Maintenance price starts from 1195 + 20% discount on extra m²
      const discountedExtraCost = extraCost * 0.8;
      maintenancePrice = baseMaintenancePrice + discountedExtraCost;
      
      maintenancePriceText = Math.round(maintenancePrice).toLocaleString('da-DK');
      
      // Only calculate extra savings if maintenance is checked
      if (includeMaintenance) {
        const extraSavings = extraCost * 0.2;
        savings = 200 + extraSavings;
      }
    }

    const finalPrice = includeMaintenance ? maintenancePrice : standardPrice;
    return {
      standardPrice,
      finalPrice,
      maintenancePriceText,
      showDiscount: includeMaintenance,
      totalSavings: savings
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const fornavn = formData.get('fornavn') as string;
    const efternavn = formData.get('efternavn') as string;
    const navn = `${fornavn} ${efternavn}`.trim();
    const email = formData.get('email') as string;
    const telefon = formData.get('telefon') as string;
    const adresse = formData.get('adresse') as string;
    const postnummer = formData.get('postnummer') as string;
    const by = formData.get('by') as string;
    const fullAdresse = `${adresse}, ${postnummer} ${by}`.trim();

    const priceInfo = calculatePrice();
    const intervalText = selectedInterval === '0' ? 'Op til 100 m²' : 
                        selectedInterval === '1' ? '101-250 m²' : 
                        selectedInterval === '2' ? `${customM2} m²` : 'Over 250 m²';

    try {
      // Send til sikker webhook
      const response = await fetch('/functions/v1/prisberegner-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          navn,
          email,
          telefon,
          adresse: fullAdresse,
          interval: intervalText,
          vedligeholdelse: includeMaintenance,
          beregnet_pris: `${priceInfo.finalPrice.toLocaleString('da-DK')} kr.`
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Ukendt fejl');
      }

      setMessage(result.message || 'Tak! Vi har modtaget din forespørgsel og vender tilbage hurtigst muligt.');
      (e.target as HTMLFormElement).reset();
      setCurrentStep(1);
      setSelectedInterval('0');
      setIncludeMaintenance(false);
      setCustomM2(251);
      
    } catch (error) {
      console.error('Fejl ved indsendelse:', error);
      setMessage('Der opstod en fejl. Prøv venligst igen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priceInfo = calculatePrice();

  return (
    <div 
      style={{
        width: '100%',
        maxWidth: '530px',
        margin: 'auto',
        fontFamily: "'Poppins', sans-serif",
        background: '#fff',
        border: '1px solid #D6DBDF',
        boxShadow: '0 8px 25px rgba(0,0,0,.1)',
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        transform: 'translateY(0)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 15px 35px rgba(0,0,0,.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,.1)';
      }}
    >
      {/* Header */}
      <div style={{
        background: '#2D4B73',
        color: '#fff',
        padding: '1rem',
        fontWeight: '600',
        fontSize: '1.1rem'
      }}>
        Algebehandling af tag
      </div>

      {currentStep === 1 ? (
        // TRIN 1: Prisberegning
        <>
          {/* Ikoner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            padding: '.75rem 1rem',
            fontSize: '.85rem',
            borderBottom: '1px solid #eee',
            textAlign: 'center'
          }}>
            <div>🧽<br />Stopper mos & alger</div>
            <div>🛡️<br />Forebygger genvækst</div>
            <div>✨<br />Fornyet tagoverflade</div>
          </div>

          {/* Gul rabatboks */}
          <div style={{
            background: '#FFE86E',
            color: '#1C1C1C',
            padding: '.75rem 1rem',
            fontWeight: '600',
            textAlign: 'center',
            fontSize: '.95rem'
          }}>
            Ved at tegne aftalen sparer du <span style={{ color: '#00539B', fontWeight: '700' }}>{Math.round(priceInfo.totalSavings)} kr.</span> på første behandling!
          </div>

          {/* Beregner */}
          <div style={{ padding: '1rem' }}>
            <label style={{
              display: 'block',
              fontWeight: '500',
              marginBottom: '.5rem',
              fontSize: '.95rem'
            }}>
              Vælg interval
            </label>
            <select
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              style={{
                width: '100%',
                padding: '.5rem',
                border: '1px solid #ccc',
                borderRadius: '0',
                marginBottom: '1.25rem'
              }}
            >
              <option value="0">Op til 100 m²</option>
              <option value="1">101‑250 m²</option>
              <option value="2">Over 250 m² (indtast præcist areal)</option>
            </select>

            {/* M² input for over 250 */}
            {selectedInterval === '2' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '500',
                  marginBottom: '.5rem',
                  fontSize: '.95rem'
                }}>
                  Indtast antal m²
                </label>
                <input
                  type="number"
                  min="251"
                  value={customM2}
                  onChange={(e) => setCustomM2(parseInt(e.target.value) || 251)}
                  style={{
                    width: '100%',
                    padding: '.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              marginBottom: '1.25rem',
              fontWeight: '500',
              fontSize: '.95rem'
            }}>
              <input
                type="checkbox"
                checked={includeMaintenance}
                onChange={(e) => setIncludeMaintenance(e.target.checked)}
                style={{
                  marginRight: '8px',
                  marginTop: '4px'
                }}
              />
              Tilføj årlig vedligeholdelsesaftale{' '}
              <span style={{ fontSize: '.9rem', color: '#555', fontWeight: '400' }}>
                (Pris: {priceInfo.maintenancePriceText} kr.)
              </span>
            </label>

            <div style={{
              fontSize: '.85rem',
              marginBottom: '1.25rem',
              lineHeight: '1.5'
            }}>
              Vi kan tilbyde en årlig serviceaftale, som inkluderer:
              <ul style={{ marginTop: '.5rem', paddingLeft: '1.2rem' }}>
                <li>Årlig forebyggende behandling, der holder taget rent og flot.</li>
                <li>Beskytter mod genvækst og forlænger tagets levetid.</li>
              </ul>
              <em style={{
                display: 'block',
                marginTop: '.75rem',
                color: '#777',
                fontStyle: 'italic'
              }}>
                Første servicebehandling finder sted i efteråret næste år og gentages hvert år.
              </em>
            </div>

            {/* Prisfelt */}
            <div style={{
              background: '#2D4B73',
              color: '#fff',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '.95rem',
              marginBottom: '1rem'
            }}>
              <span style={{ fontWeight: '500' }}>Pris første behandling</span>
              <span>
                <s style={{
                  opacity: priceInfo.showDiscount ? '.5' : '0',
                  fontSize: '.85rem',
                  marginRight: '.5rem',
                  textDecoration: priceInfo.showDiscount ? 'line-through' : 'none'
                }}>
                  {priceInfo.standardPrice.toLocaleString('da-DK')} kr.
                </s>
                <strong>{priceInfo.finalPrice.toLocaleString('da-DK')} kr.</strong>
              </span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setCurrentStep(2)}
                style={{
                  background: '#2D4B73',
                  color: '#fff',
                  padding: '.75rem 1.1rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(45,75,115,0.3)',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(45,75,115,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(45,75,115,0.3)';
                }}
              >
                Næste
              </button>
            </div>
          </div>
        </>
      ) : (
        // TRIN 2: Kundeoplysninger
        <div style={{
          padding: '1.5rem'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={() => setCurrentStep(1)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2D4B73',
                cursor: 'pointer',
                fontSize: '.9rem',
                textDecoration: 'underline'
              }}
            >
              ← Tilbage til prisberegning
            </button>
          </div>

          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.1rem',
            color: '#2D4B73'
          }}>
            Indtast dine oplysninger
          </h3>

          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                name="fornavn"
                placeholder="Fornavn"
                required
                style={{
                  flex: 1,
                  padding: '.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '.95rem'
                }}
              />
              <input
                type="text"
                name="efternavn"
                placeholder="Efternavn"
                required
                style={{
                  flex: 1,
                  padding: '.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '.95rem'
                }}
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              style={{
                padding: '.75rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '.95rem'
              }}
            />

            <input
              type="tel"
              name="telefon"
              placeholder="Telefonnummer"
              required
              style={{
                padding: '.75rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '.95rem'
              }}
            />

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                name="by"
                placeholder="By"
                required
                style={{
                  flex: 1,
                  padding: '.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '.95rem'
                }}
              />
              <input
                type="text"
                name="postnummer"
                placeholder="Postnummer"
                required
                style={{
                  flex: 1,
                  padding: '.75rem',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '.95rem'
                }}
              />
            </div>

            <input
              type="text"
              name="adresse"
              placeholder="Adresse"
              required
              style={{
                padding: '.75rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '.95rem'
              }}
            />

            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              fontSize: '.85rem',
              color: '#555',
              gap: '8px'
            }}>
              <input
                type="checkbox"
                required
                style={{ marginTop: '2px' }}
              />
              Jeg har læst og accepterer handelsbetingelserne
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: '#2D4B73',
                color: '#fff',
                padding: '.75rem',
                fontWeight: '600',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                fontSize: '.95rem'
              }}
            >
              {isSubmitting ? 'Sender...' : 'Bestil tid'}
            </button>
          </form>

          {message && (
            <div style={{
              marginTop: '1rem',
              fontWeight: '500',
              color: message.includes('Tak') ? '#2D4B73' : '#e74c3c',
              fontSize: '.9rem'
            }}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
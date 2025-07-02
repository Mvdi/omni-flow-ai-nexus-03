import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const PriceCalculatorWidget = () => {
  const [selectedInterval, setSelectedInterval] = useState('0');
  const [includeMaintenance, setIncludeMaintenance] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Prisberegning baseret på interval og vedligeholdelse
  const calculatePrice = () => {
    let standardPrice = 0;
    let maintenancePrice = 0;
    let maintenancePriceText = '';

    if (selectedInterval === '0') {
      standardPrice = 995;
      maintenancePrice = 795;
      maintenancePriceText = '795';
    } else if (selectedInterval === '1') {
      standardPrice = 1395;
      maintenancePrice = 1195;
      maintenancePriceText = '1195';
    } else {
      standardPrice = 1405;
      maintenancePrice = 1203;
      maintenancePriceText = '1203';
    }

    const finalPrice = includeMaintenance ? maintenancePrice : standardPrice;
    return {
      standardPrice,
      finalPrice,
      maintenancePriceText,
      showDiscount: includeMaintenance
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    const formData = new FormData(e.currentTarget);
    const navn = formData.get('navn') as string;
    const adresse = formData.get('adresse') as string;
    const telefon = formData.get('telefon') as string;
    const email = formData.get('email') as string;

    const priceInfo = calculatePrice();
    const intervalText = selectedInterval === '0' ? 'Op til 100 m²' : 
                        selectedInterval === '1' ? '101-250 m²' : 'Over 250 m²';

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
          adresse,
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
      setSelectedInterval('0');
      setIncludeMaintenance(false);
      
    } catch (error) {
      console.error('Fejl ved indsendelse:', error);
      setMessage('Der opstod en fejl. Prøv venligst igen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priceInfo = calculatePrice();

  return (
    <div style={{
      width: '100%',
      maxWidth: '530px',
      margin: 'auto',
      fontFamily: "'Poppins', sans-serif",
      background: '#fff',
      border: '1px solid #D6DBDF',
      boxShadow: '0 2px 6px rgba(0,0,0,.05)',
      overflow: 'hidden'
    }}>
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
        Ved at tegne aftalen sparer du <span style={{ color: '#00539B', fontWeight: '700' }}>200 kr.</span> på første behandling!
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
          <option value="2">Over 250 m²</option>
        </select>

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

        {/* Prisfelt + Bestil tid */}
        <div style={{
          background: '#2D4B73',
          color: '#fff',
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '.95rem'
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

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            onClick={() => setShowContactForm(true)}
            style={{
              background: '#2D4B73',
              color: '#fff',
              padding: '.75rem 1.1rem',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Bestil tid
          </button>
        </div>
      </div>

      {/* Kontaktformular */}
      {showContactForm && (
        <div style={{
          padding: '1.5rem',
          borderTop: '1px solid #eee'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1rem',
            color: '#2D4B73'
          }}>
            Få tilsendt et tilbud
          </h3>
          <form onSubmit={handleSubmit} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <input
              type="text"
              name="navn"
              placeholder="Dit navn"
              required
              style={{
                padding: '.5rem',
                border: '1px solid #ccc'
              }}
            />
            <input
              type="text"
              name="adresse"
              placeholder="Adresse"
              required
              style={{
                padding: '.5rem',
                border: '1px solid #ccc'
              }}
            />
            <input
              type="tel"
              name="telefon"
              placeholder="Telefonnummer"
              required
              style={{
                padding: '.5rem',
                border: '1px solid #ccc'
              }}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              style={{
                padding: '.5rem',
                border: '1px solid #ccc'
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: '#2D4B73',
                color: '#fff',
                padding: '.75rem',
                fontWeight: '600',
                border: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? 'Sender...' : 'Send og modtag tilbud'}
            </button>
          </form>
          {message && (
            <div style={{
              marginTop: '1rem',
              fontWeight: '500',
              color: message.includes('Tak') ? '#2D4B73' : '#e74c3c'
            }}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { I18nProvider } from '@/lib/i18n';
import {
  HomePage, FeaturesPage, PricingPage, HowItWorksPage, ContactPage,
  AppPage, RestaurantPage, TrackPage, LoginPage, OwnerPage, AdminPage,
  DeliveryPage, LeadsPage, OffersPage, OfferPage, NotFoundPage, IndustryPage,
} from './pages';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            {/* Marketing */}
            <Route path="/" element={<HomePage />} />
            <Route path="/features.html" element={<Navigate to="/features" replace />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing.html" element={<Navigate to="/pricing" replace />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/how-it-works.html" element={<Navigate to="/how-it-works" replace />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/contact.html" element={<Navigate to="/contact" replace />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/for-restaurants.html" element={<Navigate to="/for-restaurants" replace />} />
            <Route path="/for-restaurants" element={<IndustryPage
              title="For Restaurants"
              subtitle="Full menu, dine-in QR, pickup & delivery, bookings — one link for everything."
              whyTitle="Why restaurants choose Restivo"
              bullets={[
                { bold: 'Print once', text: 'QR on tables — price changes update instantly, no reprint.' },
                { bold: 'Two order types', text: 'pickup and delivery — delivery fee calculated server-side.' },
                { bold: 'Hours enforced', text: 'orders blocked outside opening hours (or ignore if you want).' },
                { bold: 'WhatsApp ready', text: 'send order details to your WhatsApp in one tap.' },
              ]}
              perfectFor="Shawarma, burgers, pizza, grill, seafood — any menu with categories. Popular badge for bestsellers, sold-out toggle for daily specials."
              example="Example: 3 categories (Grill / Sandwiches / Drinks) × 6-10 items each = under 30 items, loads fast on 3G."
              relatedPages={[
                { href: '/for-cafes', label: 'For Cafes' },
                { href: '/for-dessert-shops', label: 'For Dessert Shops' },
                { href: '/for-cake-shops', label: 'For Cake Shops' },
              ]}
            />} />
            <Route path="/for-cafes.html" element={<Navigate to="/for-cafes" replace />} />
            <Route path="/for-cafes" element={<IndustryPage
              title="For Cafes"
              subtitle="Quick coffee orders, pickup, repeat customers, WhatsApp confirmation."
              whyTitle="Why cafes choose Restivo"
              bullets={[
                { bold: 'Fast flow', text: 'one-tap reorders for daily regulars.' },
                { bold: 'Pickup mode', text: 'customer grabs and goes, no waiting.' },
                { bold: 'Drinks + bites', text: 'categories for both in one menu.' },
                { bold: 'WhatsApp confirm', text: 'ready-to-send order summary.' },
              ]}
              perfectFor="Espresso bars, roasters, specialty coffee — drinks with optional pastries and snacks."
              relatedPages={[
                { href: '/for-restaurants', label: 'For Restaurants' },
                { href: '/for-dessert-shops', label: 'For Dessert Shops' },
              ]}
            />} />
            <Route path="/for-dessert-shops.html" element={<Navigate to="/for-dessert-shops" replace />} />
            <Route path="/for-dessert-shops" element={<IndustryPage
              title="For Dessert Shops"
              subtitle="Visual menu, boxes, buffets, easy cart."
              whyTitle="Why dessert shops choose Restivo"
              bullets={[
                { bold: 'Photo menu', text: 'show every cake, box and platter beautifully.' },
                { bold: 'Boxes & sets', text: 'sell assortments as one item with options.' },
                { bold: 'Availability toggle', text: 'mark today\'s fresh items, hide the rest.' },
                { bold: 'Notes field', text: 'customers add custom messages per item.' },
              ]}
              perfectFor="Bakeries, dessert boxes, kunafa, baklava, ice cream — visual menus with options."
              relatedPages={[
                { href: '/for-restaurants', label: 'For Restaurants' },
                { href: '/for-cake-shops', label: 'For Cake Shops' },
              ]}
            />} />
            <Route path="/for-cake-shops.html" element={<Navigate to="/for-cake-shops" replace />} />
            <Route path="/for-cake-shops" element={<IndustryPage
              title="For Cake Shops"
              subtitle="Pre-orders, pickup windows, notes, clear pricing."
              whyTitle="Why cake shops choose Restivo"
              bullets={[
                { bold: 'Pre-orders', text: 'set pickup date and time per order.' },
                { bold: 'Custom notes', text: 'customers describe the design, message, occasion.' },
                { bold: 'Sizes & prices', text: 'list small/medium/large as separate items.' },
                { bold: 'WhatsApp review', text: 'confirm details with the customer in one tap.' },
              ]}
              perfectFor="Birthday cakes, wedding tiers, custom designs — pre-orders with clear lead times."
              relatedPages={[
                { href: '/for-dessert-shops', label: 'For Dessert Shops' },
                { href: '/for-restaurants', label: 'For Restaurants' },
              ]}
            />} />

            {/* App */}
            <Route path="/app" element={<AppPage />} />
            <Route path="/app/" element={<AppPage />} />
            <Route path="/restaurant/:slug" element={<RestaurantPage />} />
            <Route path="/track" element={<TrackPage />} />

            {/* Auth + Dashboards */}
            <Route path="/login.html" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/owner.html" element={<Navigate to="/owner" replace />} />
            <Route path="/owner" element={<OwnerPage />} />
            <Route path="/admin.html" element={<Navigate to="/admin" replace />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/offers" element={<OffersPage />} />
            <Route path="/offer/:code" element={<OfferPage />} />

            {/* Resources + 404 */}
            <Route path="/resources" element={<NotFoundPage />} />
            <Route path="/resources/" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </ErrorBoundary>
  );
}

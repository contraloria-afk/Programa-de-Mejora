import './globals.css';

export const metadata = {
  title: 'ERP Adoption Appraisal Assistant',
  description: 'Plataforma SaaS para evaluación de procesos',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

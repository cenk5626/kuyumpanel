import { Metadata } from 'next';
import ShowcaseClient from './ShowcaseClient';

export const metadata: Metadata = {
  title: 'Canlı TV Vitrin Ekranı — KuyumPanel Mücevherat',
  description: 'Kuyumcu Mağaza İçi ve Vitrin TV Canlı Fiyatlandırma ve Bilgilendirme Ekranı (Digital Signage)',
};

export default function ShowcasePage() {
  return <ShowcaseClient />;
}

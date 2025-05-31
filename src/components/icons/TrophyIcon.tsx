// src/components/icons/TrophyIcon.tsx
import { Trophy as LucideTrophy } from 'lucide-react';

interface TrophyIconProps {
  filled?: boolean;
  className?: string;
}

const TrophyIcon = ({ filled = false, className }: TrophyIconProps) => {
  if (filled) {
    // "Filled" ikon. Hedef: İlk resimdeki gibi kulpların içi boş.
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none" // Ana SVG'nin fill'i none.
        xmlns="http://www.w3.org/2000/svg"
        className={className} // Boyutlandırma ve RENK buradan gelecek.
      >
        {/* Kulplar: Sadece stroke, fill="none" (veya fill hiç belirtilmeyecek) */}
        <path
          d="M6 9H4.5C3.83696 9 3.20107 8.73661 2.73223 8.26777C2.26339 7.79893 2 7.16304 2 6.5C2 5.83696 2.26339 5.20107 2.73223 4.73223C3.20107 4.26339 3.83696 4 4.5 4H6M18 9H19.5C20.163 9 20.7989 8.73661 21.2678 8.26777C21.7366 7.79893 22 7.16304 22 6.5C22 5.83696 21.7366 5.20107 21.2678 4.73223C20.7989 4.26339 20.163 4 19.5 4H18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none" // KULPLARIN İÇİ BOŞ OLMASI İÇİN ÖNEMLİ!
        />
        {/* Ana Kupa Gövdesi ve Ayak (Bunlar dolu olacak) */}
        <path
          d="M18 2H6V9C6 10.5913 6.63214 12.1174 7.75736 13.2426C8.88258 14.3679 10.4087 15 12 15C13.5913 15 15.1174 14.3679 16.2426 13.2426C17.3679 12.1174 18 10.5913 18 9V2Z"
          fill="currentColor" // Ana gövde dolu
          stroke="currentColor" // Ana gövde dış çizgisi
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 22H17C17 20.24 16.15 18.75 14.97 18.21C14.47 17.98 14 17.55 14 17V14.66H10V17C10 17.55 9.53 17.98 9.03 18.21C7.85 18.75 7 20.24 7 22Z"
          fill="currentColor" // Ayak kısmı dolu
        />
         <path d="M4 22H20Z" fill="currentColor"/> {/* Ayak tabanı dolu */}
        {/* Ayak dış çizgisi (opsiyonel, eğer ayak zaten doluysa bu ayrı bir çizgiye gerek olmayabilir)
            Eğer bu path aşağıdaki gibi kalırsa, fill="currentColor" olan ayak path'lerinin üzerine
            tekrar bir çizgi çeker. Sadece fill yeterliyse bu path kaldırılabilir veya fill="none" yapılabilir.
            Şimdilik, görsel bütünlük için bunu da currentColor yapıyorum, ama sadece stroke olarak.
        */}
        <path
          d="M4 22H20M10 14.66V17C10 17.55 9.53 17.98 9.03 18.21C7.85 18.75 7 20.24 7 22H17C17 20.24 16.15 18.75 14.97 18.21C14.47 17.98 14 17.55 14 17V14.66H10Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none" // Bu çizginin içini doldurma
        />
      </svg>
    );
  }

  // filled false ise (yani outline isteniyorsa) lucide-react'ten gelen orijinal Trophy ikonunu kullan
  return <LucideTrophy className={className} />;
};

export default TrophyIcon;
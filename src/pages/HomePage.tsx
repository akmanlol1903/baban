// src/pages/HomePage.tsx
import { useEffect, useState } from 'react';
import { useVideoStore } from '../stores/videoStore'; //
import VideoCard from '../components/video/VideoCard'; //
import { ChevronUp, ChevronDown } from 'lucide-react'; //
import { Button } from '@/components/ui/button'; // shadcn/ui Button import edildi
import { Badge } from '@/components/ui/badge';   // shadcn/ui Badge import edildi

// formatDistanceToNow importu bu dosyada doğrudan kullanılmıyor.
// Eğer alt bileşenlerde (VideoCard gibi) de import edilmiyorsa ve gerekmiyorsa kaldırılabilir.
// import { formatDistanceToNow } from 'date-fns';

const HomePage = () => {
  const { videos, watchTimes, fetchVideos, loading } = useVideoStore(); //
  const [currentIndex, setCurrentIndex] = useState(0); //

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]); //

  const handleNext = () => {
    if (currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }; //

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }; //

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, [currentIndex, videos.length, handleNext, handlePrev]); //

  return (
    <div className="flex h-full items-center justify-center p-4"> {/* */}
      {loading ? (
        <div className="flex h-full items-center justify-center"> {/* */}
          {/* Yükleme animasyonu: Görselde değişiklik olmaması için olduğu gibi bırakıldı. shadcn/ui'de direkt bir karşılığı yok. */}
          <div className="h-12 w-12 animate-spin  border-4 border-blue-500 border-t-transparent"></div> {/* */}
        </div>
      ) : videos.length === 0 ? (
        // "No videos yet" mesajı: Mevcut özel stil ve yapı (backdrop-blur dahil) nedeniyle görsel tutarlılığı korumak adına
        // Card veya Alert gibi shadcn/ui componentlerine dönüştürülmedi. Mevcut haliyle bırakıldı.
        <div className="flex h-full flex-col items-center justify-center  bg-gray-800/50 p-8 backdrop-blur-sm"> {/* */}
          <h2 className="mt-4 text-xl font-semibold text-gray-300">No videos yet</h2> {/* */}
          <p className="mt-2 text-gray-400"> {/* */}
            Videos will appear here once they are uploaded.
          </p>
        </div>
      ) : (
        <div className="relative flex h-full w-full max-w-6xl items-center justify-center"> {/* */}
          <div className="aspect-video w-full max-h-full max-w-full"> {/* */}
            <VideoCard
              video={videos[currentIndex]}
              watchTime={watchTimes[videos[currentIndex].id] || 0}
              isLatest={currentIndex === 0}
            /> {/* */}
          </div>

          <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-4"> {/* */}
            <Button
              variant="ghost" // Temel stil için 'ghost' variantı kullanıldı
              size="icon" // Butonun içeriğe göre boyutlanması için (sadece ikon içeriyor gibi)
              onClick={handlePrev}
              disabled={currentIndex === 0}
              // Orijinal className'ler korunarak görsel tutarlılık sağlandı.
              // Button component'inin kendi padding'i yerine p-2 kullanmak için size="icon" ve className'de p-2 belirtildi.
              // shadcn Button'ın default yüksekliğini ezmek için h-auto eklenebilir veya padding ile ayarlanabilir.
              // Mevcut p-2 class'ı genellikle yeterli olacaktır.
              className="bg-gray-800/80 p-2 text-white transition-opacity hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronUp className="h-6 w-6" /> {/* */}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === videos.length - 1}
              className="bg-gray-800/80 p-2 text-white transition-opacity hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronDown className="h-6 w-6" /> {/* */}
            </Button>
          </div>

          {/* Video index göstergesi Badge component'i ile değiştirildi */}
          <Badge
            // Badge'in kendi variant stillerini (primary, secondary vb.) kullanmak yerine,
            // mevcut görünümü korumak için className ile stil atandı.
            // 'variant' prop'u kaldırılabilir veya "default" olarak bırakılıp className ile ezilebilir.
            className="absolute bottom-8 right-8 bg-gray-800/80 px-4 py-2 text-sm font-medium text-white"
          >
            {currentIndex + 1} / {videos.length} {/* */}
          </Badge>
        </div>
      )}
    </div>
  );
};

export default HomePage;
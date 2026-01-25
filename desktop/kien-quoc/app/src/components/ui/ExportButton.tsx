import { createSignal } from 'solid-js';
import { Download } from 'lucide-solid';
import { downloadGameHistoryAsJSON } from '~/lib/firebase/export';

interface ExportButtonProps {
  label?: string;
  successLabel?: string;
  class?: string;
}

export default function ExportButton(props: ExportButtonProps) {
  const [downloaded, setDownloaded] = createSignal(false);

  const handleClick = () => {
    const filename = downloadGameHistoryAsJSON();
    if (filename) {
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    }
  };

  return (
    <button
      onClick={handleClick}
      class={`flex items-center gap-2 font-bold rounded-lg transition-colors ${
        downloaded() ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
      } ${props.class || ''}`}
    >
      {downloaded() ? (
        <>{props.successLabel || '✓ Đã tải!'}</>
      ) : (
        <>
          <Download class="w-4 h-4" />
          {props.label || 'Export'}
        </>
      )}
    </button>
  );
}

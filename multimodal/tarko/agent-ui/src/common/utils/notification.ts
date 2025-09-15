import { toast } from 'react-toastify';

export function handleErrorNotification(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  toast.error(message);
}

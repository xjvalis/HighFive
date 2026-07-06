import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export const formatCS = (date, fmt) => format(date instanceof Date ? date : new Date(date), fmt, { locale: cs });

export const formatEventDate = (date) => formatCS(date, 'EEEEEE d. MMM · HH:mm');
export const formatEventDateShort = (date) => formatCS(date, 'EEEEEE d. MMM');
export const formatNotifTime = (date) => formatCS(date, 'd. MMM, HH:mm');
export const formatChatDate = (date) => formatCS(date, 'd. MMM');
export const formatTime = (date) => format(date instanceof Date ? date : new Date(date), 'HH:mm');
export const formatCommentDate = (date) => formatCS(date, 'd. MMM, HH:mm');

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

const twoDigits = (value: number) => String(value).padStart(2, '0');

const getVietnamParts = (value: Date | string) => {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
    hour: Number(partMap.hour),
    minute: Number(partMap.minute),
    second: Number(partMap.second),
  };
};

export const formatDateTimeVN = (value: Date | string) => {
  const { day, month, year, hour, minute, second } = getVietnamParts(value);
  return `${twoDigits(hour)}:${twoDigits(minute)}:${twoDigits(second)} ${twoDigits(day)}/${twoDigits(month)}/${year}`;
};

export const formatDateVN = (value: Date | string) => {
  const { day, month, year } = getVietnamParts(value);
  return `${twoDigits(day)}/${twoDigits(month)}/${year}`;
};

export const formatTimeVN = (value: Date | string) => {
  const { hour, minute, second } = getVietnamParts(value);
  return `${twoDigits(hour)}:${twoDigits(minute)}:${twoDigits(second)}`;
};

export const formatHourMinuteVN = (value: Date | string) => {
  const { hour, minute } = getVietnamParts(value);
  return `${twoDigits(hour)}:${twoDigits(minute)}`;
};

export const isSameDayVN = (left: Date | string, right: Date | string) => {
  const a = getVietnamParts(left);
  const b = getVietnamParts(right);
  return a.year === b.year && a.month === b.month && a.day === b.day;
};

export const isSameMonthVN = (left: Date | string, right: Date | string) => {
  const a = getVietnamParts(left);
  const b = getVietnamParts(right);
  return a.year === b.year && a.month === b.month;
};

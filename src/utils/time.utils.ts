export const convertToMinutes = (time: string) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

export const getDayFromDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
  });
};

export const isSameDate = (d1: Date, d2: Date) => {
  return d1.toDateString() === d2.toDateString();
};
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

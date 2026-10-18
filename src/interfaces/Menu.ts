type Course = {
  name: string;
  price: string;
  diets: string[];
};

type Menu = {
  courses: Course[];
};

type MenuDay = {
  date: string;
  courses: Course[];
};

type WeeklyMenu = {
  days: MenuDay[];
};

export type { Course, Menu, MenuDay, WeeklyMenu };
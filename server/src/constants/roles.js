export const USER_ROLES = {
  ADMIN: "admin",
  NORMAL_USER: "normal_user",
  CONSULTANT: "consultant",
  LAWYER: "lawyer",
  DECORATOR: "decorator"
};

export const ADMIN_LEVELS = {
  PRIMARY: "primary",
  SECONDARY: "secondary"
};

export const ALL_USER_ROLES = Object.values(USER_ROLES);

export const PUBLIC_USER_ROLES = [
  USER_ROLES.NORMAL_USER,
  USER_ROLES.CONSULTANT,
  USER_ROLES.LAWYER,
  USER_ROLES.DECORATOR
];

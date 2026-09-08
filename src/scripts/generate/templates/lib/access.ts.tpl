import type { Access } from "payload";

export const anyone: Access = () => true;

export const user: Access = ({ req }) => Boolean(req.user);

export const superAdmin: Access = ({ req }) => Boolean(req.user);

export function or(...accesses: Access[]): Access {
  return (args) => accesses.some((access) => access(args));
}

// Mi cuenta: autoservicio de la cuenta de la sesión (feature 002). Siempre actúa sobre req.user.
import { toAccount } from '../utils/presenters.js';

export function getAccount(req, res) {
  res.json(toAccount(req.user));
}

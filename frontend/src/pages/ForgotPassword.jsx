import { Navigate } from 'react-router-dom';

/**
 * ForgotPassword functionality has been disabled.
 * Employee passwords are now managed exclusively by system administrators.
 */
export default function ForgotPassword() {
  return <Navigate to="/login" replace />;
}

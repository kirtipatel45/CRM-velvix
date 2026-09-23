import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { candidateAuthAPI } from '../services/api';

const CandidateAuthContext = createContext(null);

export function CandidateAuthProvider({ children }) {
  const [candidate, setCandidate] = useState(() => {
    const stored = localStorage.getItem('candidateUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [candidateToken, setCandidateToken] = useState(() => {
    return localStorage.getItem('candidateToken') || null;
  });
  const [resetToken, setResetToken] = useState(() => {
    return sessionStorage.getItem('candidateResetToken') || null;
  });
  const [loading, setLoading] = useState(true);

  const logoutCandidate = useCallback(() => {
    localStorage.removeItem('candidateToken');
    localStorage.removeItem('candidateUser');
    sessionStorage.removeItem('candidateResetToken');
    setCandidateToken(null);
    setCandidate(null);
    setResetToken(null);
  }, []);

  useEffect(() => {
    if (candidateToken) {
      candidateAuthAPI
        .me(candidateToken)
        .then((res) => {
          setCandidate(res.data.candidate);
          localStorage.setItem('candidateUser', JSON.stringify(res.data.candidate));
        })
        .catch(() => {
          logoutCandidate();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [candidateToken, logoutCandidate]);

  const loginCandidate = useCallback(async (email, password) => {
    const res = await candidateAuthAPI.login({ email, password });
    if (res.data.mustResetPassword && res.data.resetToken) {
      sessionStorage.setItem('candidateResetToken', res.data.resetToken);
      setResetToken(res.data.resetToken);
      if (res.data.candidate) {
        setCandidate(res.data.candidate);
      }
      return res.data;
    }
    const { token, candidate: candidateData } = res.data;
    localStorage.setItem('candidateToken', token);
    localStorage.setItem('candidateUser', JSON.stringify(candidateData));
    setCandidateToken(token);
    setCandidate(candidateData);
    return res.data;
  }, []);

  const setResetSession = useCallback((token, candidateData) => {
    sessionStorage.setItem('candidateResetToken', token);
    setResetToken(token);
    if (candidateData) {
      setCandidate(candidateData);
    }
  }, []);

  const completePasswordReset = useCallback((token, candidateData) => {
    sessionStorage.removeItem('candidateResetToken');
    localStorage.setItem('candidateToken', token);
    localStorage.setItem('candidateUser', JSON.stringify(candidateData));
    setResetToken(null);
    setCandidateToken(token);
    setCandidate(candidateData);
  }, []);

  const updateCandidate = useCallback((candidateData) => {
    localStorage.setItem('candidateUser', JSON.stringify(candidateData));
    setCandidate(candidateData);
  }, []);

  const value = useMemo(
    () => ({
      candidate,
      candidateToken,
      resetToken,
      loading,
      isCandidateAuthenticated: !!candidateToken && !!candidate,
      loginCandidate,
      logoutCandidate,
      setResetSession,
      completePasswordReset,
      updateCandidate,
    }),
    [
      candidate,
      candidateToken,
      resetToken,
      loading,
      loginCandidate,
      logoutCandidate,
      setResetSession,
      completePasswordReset,
      updateCandidate,
    ]
  );

  return (
    <CandidateAuthContext.Provider value={value}>
      {children}
    </CandidateAuthContext.Provider>
  );
}

export const useCandidateAuth = () => useContext(CandidateAuthContext);

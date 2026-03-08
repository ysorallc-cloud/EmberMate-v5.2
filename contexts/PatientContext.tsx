// ============================================================================
// PATIENT CONTEXT
// Provides active patient state to the entire component tree
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getPatientRegistry,
  getActivePatientId,
  setActivePatient,
  addPatient as addPatientToRegistry,
  listPatients as listPatientsFromRegistry,
} from '../storage/patientRegistry';
import { useDataListener } from '../lib/events';
import { Patient, DEFAULT_PATIENT_ID } from '../types/patient';
import { logError } from '../utils/devLog';

interface PatientContextValue {
  activePatientId: string;
  activePatient: Patient | null;
  patients: Patient[];
  loading: boolean;
  switchPatient: (patientId: string) => Promise<void>;
  addPatient: (name: string, relationship?: Patient['relationship']) => Promise<Patient>;
  refresh: () => Promise<void>;
}

const PatientContext = createContext<PatientContextValue>({
  activePatientId: DEFAULT_PATIENT_ID,
  activePatient: null,
  patients: [],
  loading: true,
  switchPatient: async () => {},
  addPatient: async () => ({ id: '', name: '', createdAt: '', updatedAt: '', isDefault: false }),
  refresh: async () => {},
});

export function PatientProvider({ children }: { children: React.ReactNode }) {
  const [activePatientId, setActivePatientId] = useState(DEFAULT_PATIENT_ID);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const registry = await getPatientRegistry();
      setPatients(registry.patients);
      setActivePatientId(registry.activePatientId);
    } catch (error) {
      logError('PatientContext.refresh', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch when patient events fire
  useDataListener((category) => {
    if (category === 'patient') {
      refresh();
    }
  });

  const activePatient = patients.find(p => p.id === activePatientId) || null;

  const switchPatient = useCallback(async (patientId: string) => {
    await setActivePatient(patientId);
  }, []);

  const addPatient = useCallback(async (name: string, relationship?: Patient['relationship']) => {
    return addPatientToRegistry(name, relationship);
  }, []);

  return (
    <PatientContext.Provider
      value={{
        activePatientId,
        activePatient,
        patients,
        loading,
        switchPatient,
        addPatient,
        refresh,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  return useContext(PatientContext);
}

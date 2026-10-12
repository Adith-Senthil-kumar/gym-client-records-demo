import { create } from "zustand";

// Stands in for login: the id of the staff member "signed in". The top-bar
// role switcher updates this. Not persisted — refreshing the demo starts
// fresh as the default trainer (Priya).

interface RoleState {
  staffId: string;
  setStaffId: (id: string) => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  staffId: "t1",
  setStaffId: (id) => set({ staffId: id }),
}));

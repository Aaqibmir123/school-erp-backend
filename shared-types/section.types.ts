/* ================= BASE ================= */

export interface Section {
  _id: string;
  name: string;

  classId: {
    _id: string;
    name: string;
  };

  createdAt?: string;
}

/* ================= CREATE ================= */

export interface CreateSectionsDTO {
  classId: string;
  sections: string[];
}

/* ================= QUERY ================= */

export interface SectionQueryDTO {
  classId?: string;
}

/* ================= RESPONSE ================= */

export interface CreateSectionsResponse {
  _id: string;
  name: string;
  classId: string;
}

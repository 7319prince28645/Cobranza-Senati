export const CobroData = {
  periodos: [
    {
      title: "2025-I",
      nrcs: [
        {
          title: "Matemática Básica",
          nrc: "12345",
          fecha: "2025-08-10",
          aula: "A1",
          docente: "Ing. Pérez",
          alumnos: [
            {
              id: "12345678",
              nombre: "Juan Pérez",
              estado: "pendiente",
              monto: 150,
            },
            {
              id: "87654321",
              nombre: "Ana Gómez",
              estado: "pagado",
              monto: 150,
            },
          ],
        },
        {
          title: "Comunicación Técnica",
          nrc: "67890",
          fecha: "2025-08-11",
          aula: "B2",
          docente: "Lic. Ramírez",
          alumnos: [],
        },
      ],
    },
    {
      title: "2025-II",
      nrcs: [],
    },
  ],
};

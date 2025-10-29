import axios from "axios";

async function GetAdministrativo(id, fechaInicio, fechaFin) {

    const urlBase = import.meta.env.VITE_URL_API_LOCAL;

    const response = await axios.post(`${urlBase}/administrativo/reportes`, {
        id,
        fechaInicio,
        fechaFin
    });

    return response;

}
export default GetAdministrativo;

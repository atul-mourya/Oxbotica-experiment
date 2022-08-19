const endpoint = 'https://vehicle-api-test.herokuapp.com/api';
export const getVehicles = async () => {
    const response = await fetch(`${endpoint}/vehicles`);
    const data = await response.json();
    return data;
}

export const getVehicle = async (id) => {
    const response = await fetch(`${endpoint}/vehicles/${id}`);
    const data = await response.json();
    return data;
}

export const getVehicleTelemetry = async (id) => {
    const response = await fetch(`${endpoint}/vehicles/${id}/telemetry`);
    const data = await response.json();
    return data;
}

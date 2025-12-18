import { sincronizarDatos } from "@/services/Orthan";

export async function GET(request: Request) {
    try {
        await sincronizarDatos();
        return new Response("Datos sincronizados exitosamente", { status: 200 });
    } catch (error) {
        console.error("Error al sincronizar datos:", error);
        return new Response("Error al sincronizar datos", { status: 500 });
    }
}
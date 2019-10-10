import { Usuario } from './usuario'

export class Tarea {
    constructor(public id?: number, private descripcion?: string, private iteracion?: string, public asignatario?: Usuario, private fecha?: string, private porcentajeCumplimiento?: number) { }

    static fromJson(tareaJSON) {
        const result: Tarea = Object.assign(new Tarea(), tareaJSON)
        result.asignatario = Usuario.fromJSON(tareaJSON.asignadoA)
        return result

        /*return new Tarea(tareaJSON.id, tareaJSON.descripcion, tareaJSON.iteracion,
            Usuario.fromJSON(tareaJSON.asignadoA), tareaJSON.fecha, tareaJSON.porcentajeCumplimiento)*/
    }

    contiene(palabra: string): boolean {
        return this.descripcion.includes(palabra) || (this.asignatario && this.asignatario.nombre.includes(palabra))
    }

    cumplio(porcentaje: number): boolean {
        return this.porcentajeCumplimiento === porcentaje
    }

    cumplioMenosDe(porcentaje: number): boolean {
        return this.porcentajeCumplimiento < porcentaje
    }

    sePuedeCumplir(): boolean {
        return this.porcentajeCumplimiento < 100 && this.estaAsignada()
    }

    cumplir() {
        this.porcentajeCumplimiento = 100
    }

    desasignar() {
        this.asignatario = null
    }

    sePuedeDesasignar() {
        return this.sePuedeCumplir()
    }

    asignarA(asignatario: Usuario) {
        this.asignatario = asignatario
    }

    asignadoA(asignatario: Usuario) {
        return this.asignatario.nombre === asignatario.nombre
    }

    sePuedeAsignar() {
        return !this.estaCumplida()
    }

    estaCumplida() {
        return this.porcentajeCumplimiento === 100
    }

    estaAsignada() {
        return this.asignatario !== null
    }

    toJSON(): any {
        const result: any = Object.assign({}, this)
        result.asignatario = null
        result.asignadoA = this.asignatario ? this.asignatario.nombre : ''
        return result
    }

}

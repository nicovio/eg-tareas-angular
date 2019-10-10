
# Tareas de un equipo de desarrollo

[![Build Status](https://travis-ci.org/uqbar-project/eg-tareas-angular.svg?branch=asyncAwait)](https://travis-ci.org/uqbar-project/eg-tareas-angular)

![demo](videos/TareasDemo.gif)

Este ejemplo se basa en el seguimiento de tareas de un equipo de desarrollo y permite mostrar una aplicación completa en Angular con los siguientes conceptos

- **routing** de páginas master / detail de tareas
- utilización de Bootstrap 4 como framework de CSS + Font Awesome para los íconos
- desarrollo de front-end en Angular utilizando **servicios REST** desde el backend (por ejemplo, con XTRest)
- para lo cual es necesario la inyección del objeto **httpClient** dentro de los objetos service
- la **separación de concerns** entre las tareas como objeto de dominio, la vista html, el componente que sirve como modelo de vista y el servicio que maneja el origen de los datos
- el manejo del **asincronismo** para recibir parámetros en la ruta, así como para disparar actualizaciones y consultas hacia el backend
- de yapa, repasaremos el uso de **pipes built-in** para formatear decimales en los números y uno propio para realizar el filtro de tareas en base a un valor ingresado

# Preparación del proyecto

## Levantar el backend

Pueden descargar [la implementación XTRest del backend](https://github.com/uqbar-project/eg-tareas-xtrest). En el README encontrarán información de cómo levantar el servidor en el puerto 9000.

## Componentes adicionales

La instalación de los componentes adicionales luego de hacer `ng new eg-tareas-angular --routing` requiere estos pasos:

```bash
$ npm install ng2-bootstrap-modal
$ npm install popper
$ npm install jquery
$ npm install bootstrap
$ npm install @fortawesome/fontawesome-svg-core
$ npm install @fortawesome/free-solid-svg-icons
$ npm install @fortawesome/angular-fontawesome
```

Es decir, instalaremos bootstrap y [font awesome para Angular](https://github.com/FortAwesome/angular-fontawesome) principalmente. 

## Agregado en package.json

Es necesario incorporar Bootstrap 4 dentro del archivo _package.json_ de la siguiente manera:

```json
    "styles": [
        "src/styles.css",
        "./node_modules/bootstrap/dist/css/bootstrap.min.css"
    ],
    "scripts": [
        "./node_modules/jquery/dist/jquery.slim.min.js",
        "./node_modules/bootstrap/dist/js/bootstrap.min.js"
    ]
```

## Configuración Browser para evitar CORS

Dado que desde el front-end vamos a levantar un web server en el puerto 4200 y vamos a acceder al puerto 9000 donde está el server, técnicamente constituyen **dominios diferentes**, por lo que debemos habilitar el intercambio de recursos entre dichos orígenes diferentes, lo que se conoce como **CORS** por sus siglas en inglés (Cross-Origin Resource Sharing). De esa manera podremos hacer consultas y actualizaciones al backend sin que el navegador lo rechace por estar fuera del dominio localhost:4200.

Una opción es instalar [el siguiente plugin para Chrome](https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi?hl=en-US), lo que nos permite que aparezca a la derecha de la URL un ícono para activarlo o desactivarlo convenientemente.

Pero otra opción mejor es instalar como dependencia el manejador de CORS:

```bash
$ npm install cors
```


## Configuración ruteo

La aplicación tendrá dos páginas:

- la vista master que muestra la lista de tareas (pendientes o cumplidas)
- y la vista de detalle que sirve para asignar un recurso a una tarea

Recordamos que se definen en el archivo _app/app-routing.module.ts_ que se crea cuando hacemos `ng new nombre-app --routing`:

```typescript
const routes: Routes = [
  { path: '', redirectTo: '/tareas', pathMatch: 'full' },
       // por defecto redirigimos a la lista de tareas
  { path: 'tareas',     component: TareasComponent },
  { path: 'asignarTarea/:id', component: AsignarComponent} 
       // pasamos id dentro de la URL para asignar una tarea específica
]

...

export const routingComponents = [ TareasComponent, AsignarComponent ]
```

## Configuración del NgModule

Los routing components se importan en el módulo (archivo _app/app.module.ts_):

```
import { AppRoutingModule, routingComponents } from './app-routing.module'

@NgModule({
  declarations: [
    AppComponent,
    routingComponents,
    ...
],
```

También es necesario que importemos las definiciones de Font Awesome, y esto incluye lamentablemente cada uno de los íconos que vayamos a utilizar. Otra opción es importar todos los íconos del framework, pero esta es una práctica totalmente desaconsejable, ya que produce que el _bundle_ sea bastante voluminoso. Un bundle es lo más parecido a un ejecutable web, y se genera en base a todas las definiciones que hacemos en nuestros archivos (los de typescript se traspilan a javascript soportados por cualquier browser). Vemos entonces cómo es el import de los íconos, que incluye la llamada a una librería:

```typescript
// Font Awesome para los íconos
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faUserCheck, faUserMinus, faCalendarCheck, faTasks } from '@fortawesome/free-solid-svg-icons'

library.add(faUserCheck, faUserMinus, faCalendarCheck, faTasks)
//
``` 

Y por último dado que vamos a formatear a dos decimales con coma el % de completitud de una tarea, debemos importar los _locales_ o configuraciones regionales:

```typescript
/** Registramos el locale ES para formatear números */
import { registerLocaleData } from '@angular/common'
import localeEs from '@angular/common/locales/es'

registerLocaleData(localeEs)
//
```

El import final del NgModule queda:

```typescript
@NgModule({
  declarations: [
    AppComponent,
    routingComponents,
    FilterTareas
],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    AppRoutingModule,
    FontAwesomeModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
```

# Resumen de la arquitectura

![image](images/Arquitectura.png)

## Objetos de dominio

La tarea es un objeto de dominio al que podemos

- asignarle una persona para que la realice
- determinar si se puede asignar, esto ocurre mientras no esté cumplida
- desasignarle la persona actual
- saber si se puede cumplir una tarea o desasignarle una persona, siempre que tenga una persona asignada y no esté cumplida
- marcarla como cumplida

Todas estas responsabilidades hacen que exista una clase Tarea, en lugar de un simple JSON. Pero además como vamos a recibir una Tarea desde el backend que sí es un JSON, vamos a incorporarle dos servicios: la exportación de un objeto Tarea a su correspondiente JSON y la importación de un JSON para crear un objeto tarea. El primero se implementa con un método de instancia toJSON(), el segundo requiere crear una tarea, por lo que el método fromJSON() es **estático**. El JSON del server tiene esta estructura:

```json
{
    "id": 1,
    "descripcion": "Desarrollar componente de envio de mails",
    "iteracion": "Iteración 1",
    "porcentajeCumplimiento": 0,
    "new": false,
    "asignadoA": "Juan Contardo",
    "fecha": "02/06/2018"
}
``` 

Para el caso de id, descripcion, iteracion, porcentajeCumplimiento y fecha, los campos devueltos coinciden con los nombres y tipos definidos para la clase Tarea. En cuanto al atributo **new** que es inyectado por el framework Jackson de XTRest, es descartado ya que el atributo id es el que se utiliza para saber si el objeto fue agregado a la colección del backend. Por último tenemos el campo **asignadoA**, que es un String vs. Tarea.asignatario que en el frontend apunta a un objeto Usuario. Entonces debemos adaptar este _gap_ de la siguiente manera:

- en el fromJson() debemos tomar el string y convertirlo a un objeto Usuario cuyo nombre será ese string. Actualizamos la variable asignatario con ese usuario.
- en el toJson() generamos un Json con un atributo "asignadoA" que contiene el nombre del usuario asignatario

Los atributos de Tarea son privados, a excepción del asignatario ya que lo necesitan otros objetos.

```typescript
export class Tarea {
    constructor(public id?: number, private descripcion?: string, private iteracion?: number, public asignatario?: Usuario, private fecha?: string, private porcentajeCumplimiento?: number) { }

    contiene(palabra: string): boolean {
        return this.descripcion.includes(palabra) || this.asignatario.nombre.includes(palabra)
    }

    cumplio(porcentaje: number): boolean {
        return this.porcentajeCumplimiento == porcentaje
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

    sePuedeAsignar() {
        return this.estaCumplida()
    }

    estaCumplida() {
        return this.porcentajeCumplimiento == 100
    }
    
    estaAsignada() {
        return this.asignatario != null
    }

    ...

    toJSON(): any {
        const result : any = Object.assign({}, this)
        result.asignatario = null 
        result.asignadoA = this.asignatario ? this.asignatario.nombre : ''
        return result
    }

}
```

Otra opción para tomar una tarea como JSON que viene del backend y transformarla en una tarea como objeto de dominio con responsabilidades, es utilizar la técnica Object.assign, que pasa la información del segundo parámetro al primero (es una operación que tiene efecto colateral sobre el primer argumento):

```js
static fromJson(tareaJSON) {
  const result : Tarea = Object.assign(new Tarea(), tareaJSON)
  result.asignatario = Usuario.fromJSON(tareaJSON.asignadoA)
  return result
}
```

## Servicios

Vamos a disparar pedidos a nuestro server local de XTRest ubicado en el puerto 9000. Pero no queremos repetir el mismo _endpoint_ en todos los lugares, entonces creamos un archivo _configuration.ts_ en el directorio services y exportamos una constante:

```typescript
export const REST_SERVER_URL = 'http://localhost:9000'
```

Esa constante la vamos a utilizar en todas las llamadas de nuestros services.

### TareasService

¿Qué necesitamos hacer?

- traer todas las tareas en la página principal (método GET)
- actualizar una tarea, tanto al cumplirla como en la asignación/desasignación (termina siendo un método PUT)
- y traer una tarea específica, esto será útil en la asignación, para mostrar los datos de la tarea que estamos asignando

Veamos cómo es la definición de TareasService:

```typescript
@Injectable({
  providedIn: 'root'
})
export class TareasService implements ITareasService {

  constructor(private http: Http) { }

  async todasLasTareas() {
    const res = await this.http.get(REST_SERVER_URL + "/tareas").toPromise()
    return res.json().map(Tarea.fromJson)
  }
```

- le inyectamos el objeto http que es quien nos permite hacer pedidos GET, POST, PUT y DELETE siguiendo las convenciones REST. Para eso debemos importar la clase Http de "@angular/http" (vean el código del service para más detalles)
- **@Injectable**: indica que nuestro service participa de la inyección de dependencias, y cualquiera que en su constructor escriba "tareasService" recibirá un objeto TareasService que además tendrá inyectado un objeto http (por ejemplo _tareas.component.ts_). La configuración providedIn: 'root' indica que el service _Singleton_ será inyectado por el NgModule sin necesidad de explícitamente definirlo en el archivo _app.module.ts_, según se explica [en esta página](https://www.uno-de-piera.com/di-angular-6-providedin/). 

Para traer todas las tareas, disparamos un pedido asincrónico al servidor: "http://localhost:9000/tareas". Eso no devuelve una lista de tareas: veamos cuál es la interfaz del método get en Http:

```javascript 
(method) Http.get(url: string, options?: RequestOptionsArgs): Observable<Response>
```

Devuelve un "observable" que luego transformamos a "promesa" de una respuesta por parte del servidor. La instrucción `await` transforma ese pedido asincrónico en formato sincrónico (esto lo podemos hacer solo dentro de un método o función `async`, para más detalles te recomendamos leer [este material sobre el uso de promises con async/await](https://javascript.info/async-await), o bien [en este sitio](https://alligator.io/js/async-functions/)). **No es un pedido sincrónico**, ya que la línea siguiente `res.json().map...` no se ejecutará hasta tanto el servidor no devuelva la lista de tareas.

Recibimos un _response_ del server, que si es 200 (OK) se ubicará en la variable res. El método json() nos da una lista de json que luego las transformaremos a tareas con el método estático fromJson() de la clase Tarea. Si hay un error en el server (respuesta distinta de 200), la definición del método como `async` hace que se dispare una excepción...

```typescript
  async ngOnInit() {
    try {
      ...
      this.tareas = await this.tareasService.todasLasTareas()
    } catch (error) {
      mostrarError(this, error)
    }
  }
```
_tareas.component.ts_

(para eso conviene bajarse el proyecto backend y simular un error adrede)

```xtend
	@Get("/tareas")
	def Result tareas() {
		try {
			if (1 == 1) throw new RuntimeException("Kaboom!")
			val tareas = RepoTareas.instance.allInstances //tareasPendientes
			ok(tareas.toJson)
		} catch (Exception e) {
			internalServerError(e.message)
		}
	}
```

Del mismo modo el service define los métodos para leer una tarea por id y para actualizar, como vemos a continuación:

```typescript
  async getTareaById(id: number) {
    const res = await this.http.get(REST_SERVER_URL + "/tareas/" + id).toPromise()
    return Tarea.fromJson(res.json())
  }

  async actualizarTarea(tarea: Tarea) {
    return this.http.put(REST_SERVER_URL + "/tareas/" + tarea.id, tarea.toJSON()).toPromise()
  }
```

### UsuarioService

El service de usuarios sirve para traer la lista de usuarios en el combo de la página de asignación. También le inyectaremos el objeto http para hacer el pedido al backend, pero utilizaremos la técnica de **Promises** estándar: el método no devuelve la lista de usuarios, sino la promesa de una respuesta (Promise<Response>)...

```typescript
@Injectable({
  providedIn: 'root'
})
export class UsuariosService{

  constructor(private http: Http){}

  async usuariosPosibles() {
    return this.http.get(REST_SERVER_URL + "/usuarios").toPromise()
  }
}
```

Luego el componente de asignación debe convertir la respuesta en JSON con la lista de tareas como veremos más abajo.

## Casos de uso

### Lista de Tareas

La página inicial muestra la lista de tareas:

![image](images/tareas_vista.png)

La vista html

- tiene binding bidireccional para sincronizar el valor de búsqueda (variable _tareaBuscada_),
- también tiene una lista de errores que se visualizan si por ejemplo hay error al llamar al service
- un ngFor que recorre la lista de tareas que sale de un callback que le pasamos al service (vean la primera expresión lambda que le pasamos al suscribe)
- respecto a la botonera, tanto el cumplir como el desasignar actualizan el estado de la tarea en forma local y luego disparan un pedido PUT al server para sincronizar el estado...
- ...y por último la asignación dispara la llamada a una página específica mediante el uso del router


### Asignación de una persona a una tarea

![image](images/asignar_tarea_vista.png)

En la asignación recibimos el id de la tarea, y la convertimos en un objeto Tarea llamando al TareaService, lo llamamos tarea$ para indicar con el sufijo $ que se trata de un objeto Observable. Eso nos sirve para mostrar información de la tarea que estamos actualizando pero además

- la lista de usuarios posibles que mostraremos como opciones del combo sale de una llamada al service propio para usuarios, pero en lugar de suscribe utilizamos el método _then()_ propio de las _Promises_ de Javascript
- además queremos tener binding contra el elemento seleccionado del combo. Las opciones serían 1) que sea "tarea.asignatario", 2) que sea una referencia que vive dentro del componente de asignación: la variable asignatario. Elegimos la segunda opción porque es más sencillo cancelar sin que haya cambios en el asignatario de la tarea (botón Cancelar). En caso de Aceptar el cambio, aquí sí actualizaremos el asignatario de la tarea dentro de nuestro entorno local y luego haremos un pedido PUT al servidor para sincronizar la información.

```typescript
export class AsignarComponent {
  tarea: Tarea
  asignatario: Usuario
  usuariosPosibles = []
  errors = []

  constructor(private usuariosService: UsuariosService, private tareasService: TareasService, private router: Router, private route: ActivatedRoute) {
    try {
      this.initialize()
    } catch(error) {
      this.errors.push(error._body)
    } 

    // Truco para que refresque la pantalla 
    this.router.routeReuseStrategy.shouldReuseRoute = () => false
  }

  ngOnInit() { }

  async initialize() {
    // Llenamos el combo de usuarios
    const res = await this.usuariosService.usuariosPosibles()
    this.usuariosPosibles = res.json().map(usuarioJson => new Usuario(usuarioJson.nombre))

    // Dado el identificador de la tarea, debemos obtenerlo y mostrar el asignatario en el combo
    const idTarea = this.route.snapshot.params['id']
    this.tarea = await this.tareasService.getTareaById(idTarea)
    this.asignatario = this.usuariosPosibles.find(usuarioPosible => usuarioPosible.equals(this.tarea.asignatario))
  }

  validarAsignacion() {
    if (this.asignatario == null) {
      throw { _body: "Debe seleccionar un usuario" }
    }
  }

  async asignar() {
    try {
      this.errors = []
      this.validarAsignacion()
      this.tarea.asignarA(this.asignatario)
      await this.tareasService.actualizarTarea(this.tarea)
      this.navegarAHome()
    } catch (e) {
      this.errors.push(e._body)
    }
  }

  navegarAHome() {
    this.router.navigate(['/tareas'])
  }

}
```

## Pipes

La página inicial permite filtrar las tareas:

```html
  <tr *ngFor="let tarea of tareas | filterTareas: tareaBuscada" class="animate-repeat">
```

El criterio de filtro delega a su vez en la tarea esa responsabilidad:

```typescript
export class FilterTareas implements PipeTransform {

  transform(tareas: Tarea[], palabra: string): any {
    return tareas.filter(tarea => tarea.contiene(palabra))
  }

}
```

Además, el % de cumplimiento se muestra con dos decimales y con comas, mediante el pipe estándar de Angular:

```html
  <span class="text-xs-right">{{tarea.porcentajeCumplimiento | number:'2.2-2':'es' }}</span>
```

# Testing

El testeo requiere una parte burocrática que es repetir la importación de todos los elementos del NgModule y los particulares de TareasComponent en nuestro spec. El lector puede ver la lista de imports completa en el archivo [tareas.component.spec.ts](src/components/tareas/tareas.component.spec.ts).

## Inyección de un stub service

Queremos mantener la unitariedad de los tests y cierto grado de determinismo que nos permita tener un entorno controlado de eventos y respuestas. Dado que nuestro service real hace una llamada http, vamos a

- definir una interfaz general ITareasService con tres servicios básicos (en el archivo _tareas.service.ts_)

```typescript
export interface ITareasService {
  todasLasTareas(): Observable<any>
  getTareaById(id: number) : Observable<Tarea>
  actualizarTarea(tarea: Tarea): void
}
```

- luego generaremos un stub de nuestro TareasService que trabajará con datos fijos (archivo _stubs.service.ts_)

```typescript
export const juana = new Usuario('Juana Molina')

export class StubTareasService implements ITareasService {
    tareas = [
        new Tarea(1, "Tarea 1", "Iteracion 1", juana, "10/05/2019", 50), 
        new Tarea(2, "Tarea 2", "Iteracion 1", null, "13/08/2019", 0)
    ]

    async todasLasTareas() {
        return this.tareas
    }

    async getTareaById(id: number) {
        return this.tareas.find((tarea) => tarea.id == id)
    }

    actualizarTarea(tarea: Tarea) {}
}
```

Fíjense que el método _todasLasTareas()_ no puede devolver una lista de tareas, sino un Observable de una lista de tareas. Para lograr eso utilizamos el método of() de rxjs, que convierte un valor fijo en un observable.

- la clase TareasService implementará la nueva interfaz (archivo _tareas.service.ts_)

```typescript
export class TareasService implements ITareasService {
```

No es estrictamente necesario que stub y tarea implementen la misma interfaz, porque internamente Javascript no tiene chequeo estricto de tipos, pero didácticamente nos sirve como ejemplo de uso de interfaz de ES6 y nos permite ser más explícito en la definición de tipos, así que como primer acercamiento nos es útil. En la práctica ustedes pueden obviar este paso para no hacerlo tan burocrático.

Ahora sí, en nuestro archivo de test tenemos que inyectarle al constructor del componente el stub del service:

```typescript
  constructor(private tareasService: TareasService, private router: Router) { }
```

Para eso debemos pisar el servicio a inyectar en el método beforeEach de nuestro test, de la siguiente manera:

```typescript
  TestBed.overrideComponent(TareasComponent, {               // línea 1
    set: {
      providers: [
        { provide: TareasService, useClass: StubTareasService }
      ]
    }
  })
  
  fixture = TestBed.createComponent(TareasComponent)          // línea 2
```

Es importante el orden aquí, si instanciamos el componente primero (la línea 2) ya no será posible modificar el servicio a inyectar y veremos un error al correr nuestros tests:

```
Failed: Cannot override component metadata when the test module has already been instantiated. Make sure you are not using `inject` before `overrideComponent`.
```

Recordamos que se corren los tests mediante

```
$ ng test --sourceMap=false --watch
```

Otra opción, si queremos tener acceso al stub y manipularlo, debemos crear nosotros el stub y luego pasárselo al componente de la siguiente manera:

```typescript
  const stubTareasService = new StubTareasService
  
  TestBed.overrideComponent(TareasComponent, {
    set: {
      providers: [
        { provide: TareasService, useValue: stubTareasService }
      ]
    }
  })
```

La referencia stubTareasService la podemos crear dentro del beforeEach o bien puede ser una variable de instancia dentro del test.

## Otras configuraciones

Dado que estamos utilizando el framework de routing de Angular, es importante agregar la configuración de nuestra ruta por defecto dentro de los providers del componente que genera el TestBed:

```typescript
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ... ],
      imports: [ ... ],
      providers: [
       { provide: APP_BASE_HREF, useValue: '/' }
      ]
    })
    ...
``` 

De lo contrario te aparecerá el siguiente mensaje de error al correr los tests:

```
Failed: No base href set. Please provide a value for the APP_BASE_HREF token or add a base element to the document.
```

## Tests

### Stub service bien inyectado

Veamos los tests más interesantes: este prueba que el stub service fue inyectado correctamente

```typescript
  it('should show 2 pending tasks', () => {
    expect(2).toBe(component.tareas.length)
  })
```

Dado que el stub genera dos tareas, el componente debe tenerlas en su variable tareas (que no es privada para poder ser accedidas desde el test).

### Verificar que una tarea puede cumplirse

El segundo test prueba que una tarea que no está cumplida y está asignada puede marcarse como cumplida:

```typescript
  it('first task could be mark as done', () => {
    const resultHtml = fixture.debugElement.nativeElement
    expect(resultHtml.querySelector('#cumplir_1')).toBeTruthy()
  })
```

En la vista agregamos un identificador para el botón cumplir de cada tarea, que consiste en el string "cumplir_" concatenado con el identificador de la tarea:

```html
  <button type="button" title="Marcarla como cumplida" class="btn btn-default" (click)="cumplir(tarea)" aria-label="Cumplir"
    *ngIf="tarea.sePuedeCumplir()" id="cumplir_{{tarea.id}}">
```

Así es fácil preguntar si la tarea 1 puede cumplirse: debe existir un tag con id "cumplir_1" dentro del HTML que genera el componente.

Dejamos [aquí](https://developer.mozilla.org/es/docs/Web/API/Document/querySelector) el link para entender las búsquedas que soporta querySelector.

### Cumplir una tarea

¿Qué pasa si queremos marcar una tarea como cumplida?

- hacemos click sobre el botón cumplir
- esto debería mostrar el porcentaje de cumplimiento de dicha tarea con 100

Bueno, no exactamente 100, sino "100,00" porque le aplicamos un filter. Aquí vemos que el testeo que estamos haciendo involucra no es tan unitario, sino más bien end-to-end, ya que se prueba componente, objeto de dominio (que es quien cumple la tarea), el pipe de Angular que customizamos a dos decimales y con coma decimal y la vista html:

```typescript
  it('mark first task as done', () => {
    const resultHtml = fixture.debugElement.nativeElement
    resultHtml.querySelector('#cumplir_1').click()
    fixture.detectChanges()
    expect(resultHtml.querySelector('#porcentaje_1').textContent).toBe("100,00")
  })
```

A la vista le agregamos un id para poder encontrar el porcentaje de cumplimiento dentro de la tabla:

```html
<span class="text-xs-right" id="porcentaje_{{tarea.id}}">{{tarea.porcentajeCumplimiento | number:'2.2-2':'es' }}</span>
```

### Búsqueda de tareas

Si buscamos "2", debería traernos únicamente la "Tarea 2". No podemos preguntar si la lista de tareas tiene un solo elemento, porque el componente siempre tiene las dos tareas y el que filtra es nuestro TareasPipe en su método transform. Entonces lo que vamos a hacer es buscar las clases "animate-repeat" que tienen nuestros tr en la vista _tareas.component.html_:

```html
  <tr *ngFor="let tarea of tareas | filterTareas: tareaBuscada" class="animate-repeat">
```

de la siguiente manera:

```typescript
  it('searching for second task should have one tr in tasks list', () => {
    component.tareaBuscada = "2"
    fixture.detectChanges()
    const resultHtml = fixture.debugElement.nativeElement
    expect(resultHtml.querySelectorAll('.animate-repeat').length).toBe(1)
  })
```

Aquí utilizamos querySelectorAll() que devuelve la lista de elementos html que cumplen nuestro criterio de búsqueda, esperando que solo haya una tarea.

Dejamos al lector que siga revisando los otros tests, que tienen características similares.

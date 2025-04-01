// abstract class Service {
//   abstract start(): void;
//   abstract stop(): void;
// }

// export default Service;


export default class Service {
  start(){
    console.log(`${this.constructor.name} started.`);
  }

  stop(){
    console.log(`${this.constructor.name} stopped.`)
  }
}
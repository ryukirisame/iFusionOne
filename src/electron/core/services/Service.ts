// abstract class Service {
//   abstract start(): void;
//   abstract stop(): void;
// }

// export default Service;


export default class Service {
  async start(){
    console.log(`${this.constructor.name} started.`);
  }

  async stop(){
    console.log(`${this.constructor.name} stopped.`)
  }
}
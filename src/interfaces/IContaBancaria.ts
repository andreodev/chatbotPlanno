export interface IContaBancario {
			name: string,
			balance: number,
			archived: boolean,
			idSync: string,
			bank: {
				name: string,
				icon: string,
				idSync: string,
      }
}
import { Column, Entity, OneToMany } from 'typeorm';
import { User } from './User';

@Entity('Role', { schema: 'paravibe_db' })
export class Role {
  @Column('int', { primary: true, name: 'role_id' })
  roleId: number;

  @Column('varchar', {
    name: 'name',
    nullable: true,
    comment: 'Enum: USER, ADMIN',
    length: 255,
  })
  name: string | null;

  @OneToMany(() => User, (user) => user.role)
  users: User[];
}

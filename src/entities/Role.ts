import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User';

@Entity('Role', { schema: 'paravibe_db' })
export class Role {
  @PrimaryGeneratedColumn({ type: 'int', name: 'role_id' })
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

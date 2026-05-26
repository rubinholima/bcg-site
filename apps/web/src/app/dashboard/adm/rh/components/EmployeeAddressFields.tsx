"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormGrid } from "@/components/dashboard/players/ExpandableSection";
import { type EmployeeAddress } from "@/lib/employee-types";

interface EmployeeAddressFieldsProps {
  address: EmployeeAddress;
  onChange: (next: EmployeeAddress) => void;
  birthDate?: string;
  onBirthDateChange?: (value: string) => void;
}

export function EmployeeAddressFields({
  address,
  onChange,
  birthDate = "",
  onBirthDateChange,
}: EmployeeAddressFieldsProps) {
  const set = (key: keyof EmployeeAddress, value: string) => {
    onChange({ ...address, [key]: value.toLocaleUpperCase("pt-BR") });
  };

  return (
    <FormGrid cols={2}>
      <div className="grid min-w-0 gap-2 sm:col-span-2">
        <Label htmlFor="emp-addr-street">Logradouro</Label>
        <Input
          id="emp-addr-street"
          value={address.street ?? ""}
          onChange={(e) => set("street", e.target.value)}
          placeholder="RUA, AVENIDA..."
          className="uppercase"
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="emp-addr-number">Número</Label>
        <Input
          id="emp-addr-number"
          value={address.number ?? ""}
          onChange={(e) => set("number", e.target.value)}
          placeholder="Nº"
          className="uppercase"
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="emp-addr-complement">Complemento</Label>
        <Input
          id="emp-addr-complement"
          value={address.complement ?? ""}
          onChange={(e) => set("complement", e.target.value)}
          placeholder="APTO, BLOCO..."
          className="uppercase"
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="emp-addr-neighborhood">Bairro</Label>
        <Input
          id="emp-addr-neighborhood"
          value={address.neighborhood ?? ""}
          onChange={(e) => set("neighborhood", e.target.value)}
          className="uppercase"
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="emp-addr-city">Cidade</Label>
        <Input
          id="emp-addr-city"
          value={address.city ?? ""}
          onChange={(e) => set("city", e.target.value)}
          className="uppercase"
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="emp-addr-state">UF</Label>
        <Input
          id="emp-addr-state"
          value={address.state ?? ""}
          onChange={(e) => set("state", e.target.value)}
          maxLength={2}
          className="uppercase"
        />
      </div>
      {onBirthDateChange ? (
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="emp-birthDate">Data de nascimento</Label>
          <Input
            id="emp-birthDate"
            type="date"
            className="text-foreground [&::-webkit-datetime-edit]:text-foreground h-10"
            value={birthDate}
            onChange={(e) => onBirthDateChange(e.target.value)}
          />
        </div>
      ) : null}
      <div className="grid min-w-0 gap-2 sm:col-span-2">
        <Label htmlFor="emp-addr-zip">CEP</Label>
        <Input
          id="emp-addr-zip"
          value={address.zipCode ?? ""}
          onChange={(e) => set("zipCode", e.target.value)}
          placeholder="00000-000"
          inputMode="numeric"
        />
      </div>
    </FormGrid>
  );
}

import { Console } from "@/components/console";
import { LocaleProvider } from "@/lib/locale";

export default function Home() {
  return (
    <LocaleProvider>
      <Console />
    </LocaleProvider>
  );
}

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MyNFTModule", (m) => {
  const name = m.getParameter("name", "MyNFT");
  const symbol = m.getParameter("symbol", "MNFT");
  const myNft = m.contract("MyNFT", [name, symbol]);
  return { myNft };
});

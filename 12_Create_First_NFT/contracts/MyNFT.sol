// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Simple ERC-721 with per-token metadata URI
contract MyNFT is ERC721, Ownable {
    // OZ v5 uses Ownable(initialOwner)
    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    {}

    // incremental token ids starting from 1 (no Counters.sol in OZ v5)
    uint256 private _nextTokenId = 1;

    // store each token's metadata URI (e.g. ipfs://CID)
    mapping(uint256 => string) private _tokenURIs;

    event Minted(address indexed to, uint256 indexed tokenId, string uri);

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        require(_exists(tokenId), "ERC721: URI set for nonexistent token");
        _tokenURIs[tokenId] = uri;
    }

    /// @notice Owner mints to `to` with a ready token URI (IPFS or HTTPS).
    function mintTo(address to, string calldata uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        emit Minted(to, tokenId, uri);
        return tokenId;
    }
}
